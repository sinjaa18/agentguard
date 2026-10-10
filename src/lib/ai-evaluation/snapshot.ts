import { EvaluationRubric } from "./contracts.ts";
import { canonicalJson, stableHash } from "./runEvaluation.ts";
import { redactSensitiveText, redactSensitiveValue } from "./redaction.ts";
import type { AgentDocument, ScenarioDocument } from "../../types/database.ts";
import type { EvaluationMode } from "./runEvaluation.ts";

export function createEvaluationSnapshot(
  agent: AgentDocument,
  scenarios: ScenarioDocument[],
  mode: EvaluationMode,
  evaluatedModel: string,
  judgeModel: string,
) {
  const agentSnapshot = {
    name: agent.name,
    description: agent.description.slice(0, 1_000),
    systemPromptRedacted: redactSensitiveText(agent.systemPrompt).slice(0, 8_000),
    systemPromptHash: stableHash(agent.systemPrompt),
    modelConfigured: agent.model,
    modelResolved: evaluatedModel,
    modelProvider: mode === "GEMINI" ? "google-gemini" : "synthetic-deterministic-fixture",
    mode,
    version: agent.version,
    capabilities: agent.capabilities,
    tools: agent.tools,
  };
  const scenarioSnapshot = scenarios.map((scenario) => ({
    id: scenario.id,
    suiteId: scenario.suiteId ?? "saved",
    suiteVersion: scenario.suiteVersion ?? 1,
    title: scenario.title,
    category: scenario.category,
    severity: scenario.severity,
    input: scenario.input,
    expected: scenario.expected,
    failure: scenario.failure,
    tools: scenario.tools,
    acceptanceCriteria: scenario.acceptanceCriteria ?? [],
    forbiddenBehaviors: scenario.forbiddenBehaviors ?? [],
    forbiddenTools: scenario.forbiddenTools ?? [],
    expectedTools: scenario.expectedTools ?? [],
    referenceFacts: scenario.referenceFacts ?? [],
    forbiddenClaims: scenario.forbiddenClaims ?? [],
    toolOutputInjection: scenario.toolOutputInjection ?? null,
    maxToolCalls: scenario.maxToolCalls ?? 3,
    requireClarification: scenario.requireClarification ?? false,
  }));
  const suiteHash = stableHash(scenarioSnapshot);
  const rubricHash = stableHash(EvaluationRubric);
  const snapshot = redactSensitiveValue({
    agent: agentSnapshot,
    suite: { id: scenarios[0]?.suiteId ?? "agent-saved-suite", version: scenarios[0]?.suiteVersion ?? 1, scenarioIds: scenarios.map((scenario) => scenario.id), hash: suiteHash },
    rubric: { ...EvaluationRubric, hash: rubricHash },
    runner: {
      version: "agentguard-runner/2.1.0", maxSteps: 4, maxToolCalls: 3, maxScenarios: 12,
      maxScenarioProviderBudgetMs: 150_000,
      retryableProviderErrors: ["RATE_LIMIT", "UNAVAILABLE"],
      agentGeneration: { maxOutputTokens: 1_200, timeoutMs: 15_000, retries: 1 },
      judgeProvider: mode === "GEMINI" ? "google-gemini" : "synthetic-deterministic-fixture",
      judgeModel,
      judgeGeneration: { maxOutputTokens: 1_800, timeoutMs: 12_000, retries: 1 },
    },
    scenarios: scenarioSnapshot,
  });
  return { snapshot, suiteHash, rubricHash, configHash: stableHash(snapshot), canonical: canonicalJson(snapshot) };
}
