import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { DocumentReference } from "firebase-admin/firestore";
import { z } from "zod";
import { getAdminAuth, getAdminFirestore, FirebaseAdminSetupError } from "@/lib/firebase/admin";
import { extractBearerToken, verifyFirebaseIdToken } from "@/lib/firebase/bearerAuth";
import { EvaluationRunRequestSchema } from "@/lib/firebase/apiRequestSchemas";
import { withOwnedEvaluationResources } from "@/lib/firebase/ownedEvaluationResources";
import { createEvaluationSnapshot } from "@/lib/ai-evaluation/snapshot";
import { runEvaluationPipeline } from "@/lib/ai-evaluation/runEvaluation";
import { RUBRIC_VERSION } from "@/lib/ai-evaluation/contracts";
import { BUILTIN_REDTEAM_SUITE } from "@/lib/ai-evaluation/redteamScenarios";
import { redactSensitiveValue } from "@/lib/ai-evaluation/redaction";
import type { AgentDocument, ScenarioDocument } from "@/types/database";
import type { ModelProvider } from "@/lib/ai-evaluation/contracts";

export const runtime = "nodejs";

const MAX_RUN_SCENARIOS = 12;
const MODEL_IDS = ["gemini-3.8-flash", "gemini-3.6-flash"] as const;

const ToolSchema = z.object({
  id: z.string().optional(), name: z.string().min(1).max(80), description: z.string().max(500),
  parameters: z.array(z.string().max(80)).max(16), risk: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});
const AgentSchema = z.object({
  name: z.string().min(1).max(120), description: z.string().max(1_000).default(""), systemPrompt: z.string().max(8_000),
  model: z.string().min(1).max(100), mode: z.enum(["MOCK", "LIVE"]), version: z.string().max(80),
  capabilities: z.array(z.string().max(160)).max(30), tools: z.array(ToolSchema).max(12),
});
const ScenarioSchema = z.object({
  title: z.string().min(1).max(140), category: z.enum(["NORMAL", "EDGE_CASE", "PROMPT_INJECTION", "TOOL_ABUSE", "DESTRUCTIVE_ACTION", "GOAL_DRIFT", "HALLUCINATION", "TOOL_LOOP"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), input: z.string().min(1).max(2_000), expected: z.string().min(1).max(1_000),
  failure: z.string().min(1).max(1_000), tools: z.array(z.string().max(80)).max(12), status: z.enum(["PASSED", "FAILED", "PENDING"]).default("PENDING"),
  acceptanceCriteria: z.array(z.string().max(300)).max(8).optional(), forbiddenBehaviors: z.array(z.string().max(300)).max(8).optional(),
  forbiddenTools: z.array(z.string().max(80)).max(12).optional(), expectedTools: z.array(z.string().max(80)).max(8).optional(),
  referenceFacts: z.array(z.string().max(500)).max(8).optional(), forbiddenClaims: z.array(z.string().max(500)).max(8).optional(),
  toolOutputInjection: z.string().max(1_000).optional(), maxToolCalls: z.number().int().min(0).max(3).optional(), requireClarification: z.boolean().optional(),
  suiteId: z.string().max(100).optional(), suiteVersion: z.number().int().nonnegative().optional(),
});

let activeRuns = 0;

export async function POST(request: NextRequest) {
  const requestStartedAt = Date.now();
  if (activeRuns >= 2) return NextResponse.json({ error: "RUN_CAPACITY", message: "AgentGuard is at run capacity. Try again shortly." }, { status: 429 });
  activeRuns++;
  let runRef: DocumentReference | null = null;
  try {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "UNAUTHORIZED", message: "Please sign in again to run an evaluation." }, { status: 401 });
    const adminAuth = getAdminAuth();
    const ownerId = await verifyFirebaseIdToken(token, (value, checkRevoked) => adminAuth.verifyIdToken(value, checkRevoked));
    if (!ownerId) return NextResponse.json({ error: "UNAUTHORIZED", message: "Your session could not be verified. Please sign in again." }, { status: 401 });

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 16_384) return NextResponse.json({ error: "INVALID_REQUEST", message: "The evaluation request is too large." }, { status: 413 });
    let requestBody: unknown;
    try {
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > 16_384) {
        return NextResponse.json({ error: "INVALID_REQUEST", message: "The evaluation request is too large." }, { status: 413 });
      }
      requestBody = JSON.parse(rawBody);
    }
    catch { return NextResponse.json({ error: "INVALID_REQUEST", message: "The request body must be valid JSON." }, { status: 400 }); }
    const bodyResult = EvaluationRunRequestSchema.safeParse(requestBody);
    if (!bodyResult.success) return NextResponse.json({ error: "INVALID_REQUEST", message: "Choose a valid agent and evaluation suite." }, { status: 400 });
    const body = bodyResult.data;
    if (body.scenarioIds && new Set(body.scenarioIds).size !== body.scenarioIds.length) {
      return NextResponse.json({ error: "INVALID_REQUEST", message: "The selected suite contains duplicate scenarios." }, { status: 400 });
    }

    const db = getAdminFirestore();
    const access = await withOwnedEvaluationResources({
      ownerId,
      agentId: body.agentId,
      scenarioIds: body.suiteId === "saved" ? body.scenarioIds ?? [] : [],
      loadAgent: (id) => db.collection("agents").doc(id).get(),
      loadScenarios: (ids) => Promise.all(ids.map((id) => db.collection("scenarios").doc(id).get())),
      execute: async ({ ownerId: verifiedOwnerId, agent: agentDoc, scenarios: documents }) => {
        const parsedAgent = AgentSchema.safeParse(agentDoc.data());
        if (!parsedAgent.success) return NextResponse.json({ error: "INVALID_AGENT", message: "The saved agent configuration is incomplete or invalid." }, { status: 422 });
        const ownerId = verifiedOwnerId;
        const agent = { id: agentDoc.id, ownerId, ...parsedAgent.data } as AgentDocument;

        let scenarios: ScenarioDocument[];
        if (body.suiteId === "agentguard-redteam-v1") {
          scenarios = BUILTIN_REDTEAM_SUITE.cases.map((scenario) => ({ ...scenario, id: scenario.id, agentId: agent.id, ownerId })) as unknown as ScenarioDocument[];
        } else {
          const parsed = documents.map((document) => ScenarioSchema.safeParse(document.data()));
          if (parsed.some((result) => !result.success)) return NextResponse.json({ error: "INVALID_SCENARIO", message: "A saved scenario is invalid and cannot be evaluated." }, { status: 422 });
          scenarios = documents.map((document, index) => ({ id: document.id, agentId: agent.id, ownerId, ...parsed[index].data }) as ScenarioDocument);
        }

        if (scenarios.length > MAX_RUN_SCENARIOS) return NextResponse.json({ error: "SUITE_TOO_LARGE", message: `Select at most ${MAX_RUN_SCENARIOS} scenarios per run.` }, { status: 400 });
        const isBuiltIn = body.suiteId === "agentguard-redteam-v1";
        if (!isBuiltIn && (new Set(scenarios.map((scenario) => scenario.suiteId ?? "saved")).size > 1 || new Set(scenarios.map((scenario) => scenario.suiteVersion ?? 1)).size > 1)) {
          return NextResponse.json({ error: "MIXED_SUITES", message: "Choose scenarios from one saved suite." }, { status: 400 });
        }

        const agentModel = body.mode === "GEMINI" ? resolveModel(agent.model) : "offline-fixture";
        if (body.mode === "GEMINI" && !agentModel) return NextResponse.json({ error: "UNSUPPORTED_MODEL", message: "Live runs currently support Gemini 3.8 Flash and Gemini 3.6 Flash only. Use deterministic mode for other configurations." }, { status: 422 });
        const judgeModel = process.env.AGENTGUARD_JUDGE_MODEL || "gemini-3.8-flash";
        if (body.mode === "GEMINI" && !MODEL_IDS.includes(judgeModel as typeof MODEL_IDS[number])) {
          return NextResponse.json({ error: "JUDGE_MODEL_UNSUPPORTED", message: "The configured judge model is not supported." }, { status: 503 });
        }
        const snapshot = createEvaluationSnapshot(agent, scenarios, body.mode, agentModel ?? "unavailable", body.mode === "GEMINI" ? judgeModel : "synthetic-deterministic-fixture");
        const suiteId = isBuiltIn ? BUILTIN_REDTEAM_SUITE.id : scenarios[0]?.suiteId ?? "agent-saved-suite";
        const collection = db.collection("evaluations");
        runRef = collection.doc();
        await runRef.create({
          id: runRef.id, agentId: agent.id, ownerId, total: scenarios.length, completed: 0, passed: 0, failed: 0, status: "RUNNING",
          mode: body.mode, suiteId, scenarioIds: scenarios.map((scenario) => scenario.id), scenarioSnapshot: snapshot.snapshot.scenarios,
          suiteHash: snapshot.suiteHash, rubricVersion: RUBRIC_VERSION, rubricHash: snapshot.rubricHash,
          agentModel: agentModel ?? "unavailable", judgeModel: body.mode === "GEMINI" ? judgeModel : "synthetic-deterministic-fixture",
          configSnapshot: snapshot.snapshot, configHash: snapshot.configHash, createdAt: FieldValue.serverTimestamp(), startedAt: FieldValue.serverTimestamp(),
        });

        let agentProvider: ModelProvider | undefined;
        let judgeProvider: ModelProvider | undefined;
        if (body.mode === "GEMINI") {
          if (!process.env.GEMINI_API_KEY) {
            await runRef.update({ status: "FAILED", errorCategory: "PROVIDER_NOT_CONFIGURED", updatedAt: FieldValue.serverTimestamp() });
            return NextResponse.json({ error: "PROVIDER_NOT_CONFIGURED", message: "Live Gemini evaluation is not configured on this deployment." }, { status: 503 });
          }
          const providerModule = await import("@/lib/ai-evaluation/geminiProvider");
          agentProvider = providerModule.geminiProvider;
          judgeProvider = providerModule.geminiProvider;
        }

        const results = await runEvaluationPipeline({
          runId: runRef.id, agent, scenarios, mode: body.mode, agentProvider, judgeProvider,
          judgeModel: body.mode === "GEMINI" ? judgeModel : "synthetic-deterministic-fixture", signal: request.signal,
        });
        const cancelled = request.signal.aborted || results.some((result) => result.status === "CANCELLED");
        const incomplete = results.some((result) => result.status === "UNJUDGEABLE");
        const status = cancelled ? "CANCELLED" : incomplete ? "PARTIAL" : "COMPLETED";
        const passed = results.filter((result) => result.passed).length;
        const unjudgeable = results.filter((result) => result.status === "UNJUDGEABLE").length;
        const completed = results.length - unjudgeable;
        const failed = results.filter((result) => result.status === "COMPLETED" && !result.passed).length;
        const batch = db.batch();
        const traceIds: string[] = [];
        const seenFailureKeys = new Set<string>();
        for (const result of results) {
          const scenario = scenarios.find((item) => item.id === result.scenarioId)!;
          const traceRef = db.collection("executionTraces").doc();
          traceIds.push(traceRef.id);
          const toolUsed = result.tools[0]?.name ?? null;
          batch.create(traceRef, {
            id: traceRef.id, evaluationId: runRef.id, agentId: agent.id, ownerId, scenarioId: scenario.id,
            status: result.passed ? "PASSED" : result.status === "UNJUDGEABLE" ? "UNJUDGEABLE" : "FAILED", outcome: result.judge.status, events: redactSensitiveValue(result.events),
            userInput: redactSensitiveValue(scenario.input), agentResponse: redactSensitiveValue(result.response), toolUsed,
            toolResult: redactSensitiveValue(JSON.stringify(result.tools.map((tool) => ({ name: tool.name, status: tool.status, result: tool.result }))).slice(0, 8_000)),
            passed: result.passed, reason: result.judge.rationale, riskScore: result.riskScore,
            scenarioCategory: scenario.category, scenarioSeverity: scenario.severity, scenarioExpected: scenario.expected,
            evidence: redactSensitiveValue(result.evidence), judge: redactSensitiveValue(result.judge), policyFindings: redactSensitiveValue(result.policyFindings),
            groundingFindings: redactSensitiveValue(result.groundingFindings), toolObservations: redactSensitiveValue(result.tools), telemetry: redactSensitiveValue(result.telemetry),
            errorCategory: result.errorCategory, createdAt: FieldValue.serverTimestamp(),
          });
          const hasDeterministicViolation = result.policyFindings.some((finding) => finding.outcome === "VIOLATION" || finding.outcome === "BLOCKED");
          const hasEvaluatedFailure = result.status === "COMPLETED" && !result.passed;
          if (hasDeterministicViolation || hasEvaluatedFailure) {
            const key = `${scenario.id}:${result.policyFindings.map((item) => item.code).sort().join(",")}:${result.judge.status}`;
            if (!seenFailureKeys.has(key)) {
              seenFailureKeys.add(key);
              const failureRef = db.collection("failures").doc();
              batch.create(failureRef, {
                id: failureRef.id, evaluationId: runRef.id, agentId: agent.id, ownerId, scenarioId: scenario.id,
                severity: scenario.severity, category: result.policyFindings[0]?.code ?? `JUDGE_${result.judge.status}`,
                title: scenario.title, observedBehavior: redactSensitiveValue(result.response || `Evaluation unavailable (${result.errorCategory ?? result.judge.status}).`),
                expectedBehavior: redactSensitiveValue(scenario.expected), risk: `Deterministic risk score ${result.riskScore}/100.`,
                rootCause: redactSensitiveValue(result.policyFindings[0]?.code ?? result.judge.rationale),
                recommendedFix: "Review the cited evidence and scenario acceptance criteria, then update the agent configuration and rerun the same suite.",
                createdAt: FieldValue.serverTimestamp(),
              });
            }
          }
        }
        batch.update(runRef, {
          status, completed, passed, failed, unjudgeable,
          traceIds, errorCategory: incomplete ? results.find((result) => result.errorCategory)?.errorCategory ?? (results.some((result) => result.judge.status === "UNJUDGEABLE") ? "INSUFFICIENT_OR_INVALID_EVIDENCE" : "JUDGE_UNAVAILABLE") : null,
          updatedAt: FieldValue.serverTimestamp(), completedAt: FieldValue.serverTimestamp(), totalDurationMs: Date.now() - requestStartedAt,
        });
        await batch.commit();

        const report = {
          label: body.mode === "GEMINI" ? "live Gemini-backed simulated-agent evaluation" : "synthetic deterministic run; configured agent was not executed",
          evaluationId: runRef.id, agentId: agent.id, mode: body.mode, status, suiteId,
          configSnapshot: snapshot.snapshot, configHash: snapshot.configHash, rubricVersion: RUBRIC_VERSION, rubricHash: snapshot.rubricHash,
          total: scenarios.length, completed, passed, failed, unjudgeable,
          results: results.map((result, index) => redactSensitiveValue({ ...result, scenario: snapshot.snapshot.scenarios[index] })),
        };
        return NextResponse.json({ evaluationId: runRef.id, status, total: scenarios.length, completed, passed, failed, unjudgeable, report });
          },
    });
    if (!access.authorized) {
      const message = access.unavailable === "AGENT" ? "That agent is unavailable." : "One or more scenarios are unavailable for this agent.";
      return NextResponse.json({ error: "NOT_FOUND", message }, { status: 404 });
    }
    return access.value;
  } catch (error) {
    const failedRunRef = runRef as DocumentReference | null;
    if (failedRunRef) {
      try { await failedRunRef.update({ status: request.signal.aborted ? "CANCELLED" : "FAILED", errorCategory: safeErrorCategory(error), updatedAt: FieldValue.serverTimestamp() }); } catch { /* The initial write may also have failed. */ }
    }
    if (error instanceof FirebaseAdminSetupError) {
      return NextResponse.json({ error: "FIREBASE_ADMIN_NOT_CONFIGURED", message: "Secure evaluation storage is not configured. Add Firebase Admin credentials to the server environment." }, { status: 503 });
    }
    const category = safeErrorCategory(error);
    return NextResponse.json({ error: category, message: userFacingError(category) }, { status: category === "RUN_CAPACITY" ? 429 : 500 });
  } finally {
    activeRuns--;
  }
}

function resolveModel(configured: string): string | null {
  if (configured === "Gemini") return MODEL_IDS[0];
  return MODEL_IDS.includes(configured as typeof MODEL_IDS[number]) ? configured : null;
}

function safeErrorCategory(error: unknown): string {
  if (error instanceof FirebaseAdminSetupError) return "FIREBASE_ADMIN_NOT_CONFIGURED";
  if (error && typeof error === "object" && "category" in error) return String(error.category).replace(/[^A-Z_]/g, "").slice(0, 60) || "EVALUATION_FAILED";
  return "EVALUATION_FAILED";
}

function userFacingError(category: string) {
  if (category === "RATE_LIMIT") return "The model provider is rate limited. Try again shortly.";
  if (category === "TIMEOUT") return "The model provider timed out. Try a smaller suite.";
  if (category === "UNAVAILABLE") return "The model provider is temporarily unavailable.";
  return "The evaluation could not be completed. Check server configuration and try again.";
}
