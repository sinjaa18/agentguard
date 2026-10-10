import test from "node:test";
import assert from "node:assert/strict";
import { EvaluationRunRequestSchema } from "../src/lib/firebase/apiRequestSchemas.ts";
import { withOwnedEvaluationResources } from "../src/lib/firebase/ownedEvaluationResources.ts";
import { withValidatedScenarioGenerationRequest } from "../src/lib/firebase/apiRequestSchemas.ts";
import { verifiedBearerUserId } from "../src/lib/firebase/bearerAuth.ts";

function resource(id, fields, exists = true) {
  return { id, exists, get: (field) => fields[field], data: () => ({ ...fields }) };
}

const agent = (ownerId = "verified-user") => resource("agent-a", {
  ownerId, name: "Private Agent Name", systemPrompt: "private configuration", description: "private details",
  model: "gemini-3.8-flash", mode: "LIVE", version: "1", capabilities: [], tools: [],
});
const scenario = (ownerId = "verified-user", agentId = "agent-a", exists = true) => resource("scenario-a", {
  ownerId, agentId, title: "Private Scenario", category: "NORMAL", severity: "LOW", input: "private input",
  expected: "private expected behavior", failure: "private failure", tools: [],
}, exists);

async function verifiedOwner() {
  return verifiedBearerUserId("Bearer fixture-token", async () => ({ uid: "verified-user" }));
}

async function attemptEvaluation({ agentDocument = agent(), scenarioDocument = scenario(), scenarioCount = 1, body = { agentId: "agent-a", mode: "GEMINI", suiteId: "saved", scenarioIds: ["scenario-a"] } } = {}) {
  const ownerId = await verifiedOwner();
  const parsed = EvaluationRunRequestSchema.safeParse(body);
  const effects = { providerCalls: 0, persistenceCalls: 0, persisted: [] };
  if (!parsed.success) return { result: { authorized: false, unavailable: "INVALID_REQUEST" }, effects };
  const result = await withOwnedEvaluationResources({
    ownerId,
    agentId: parsed.data.agentId,
    scenarioIds: parsed.data.scenarioIds,
    loadAgent: async () => agentDocument,
    loadScenarios: async () => scenarioCount === 0 ? [] : [scenarioDocument],
    execute: async ({ ownerId: authenticatedUid }) => {
      effects.providerCalls++;
      effects.persistenceCalls++;
      effects.persisted.push({ ownerId: authenticatedUid });
      return { evaluationId: "fixture-evaluation" };
    },
  });
  return { result, effects };
}

test("evaluation route authorization blocks a foreign agent before provider or persistence work", async () => {
  const { result, effects } = await attemptEvaluation({ agentDocument: agent("another-user") });
  assert.deepEqual(result, { authorized: false, unavailable: "AGENT" });
  assert.equal(effects.providerCalls, 0);
  assert.equal(effects.persistenceCalls, 0);
  assert.equal(JSON.stringify(result).includes("private"), false);
});

test("evaluation route authorization blocks foreign, cross-agent, and missing scenarios before side effects", async () => {
  const cases = [
    { scenarioDocument: scenario("another-user") },
    { scenarioDocument: scenario("verified-user", "different-agent") },
    { scenarioDocument: scenario("verified-user", "agent-a", false) },
    { scenarioCount: 0 },
  ];
  for (const candidate of cases) {
    const { result, effects } = await attemptEvaluation(candidate);
    assert.deepEqual(result, { authorized: false, unavailable: "SCENARIO" });
    assert.equal(effects.providerCalls, 0);
    assert.equal(effects.persistenceCalls, 0);
    assert.equal(JSON.stringify(result).includes("private"), false);
  }
});

test("valid evaluation authorization passes the verified UID to the persistence continuation", async () => {
  const { result, effects } = await attemptEvaluation();
  assert.equal(result.authorized, true);
  assert.equal(effects.providerCalls, 1);
  assert.equal(effects.persistenceCalls, 1);
  assert.deepEqual(effects.persisted, [{ ownerId: "verified-user" }]);

  const forged = await attemptEvaluation({ body: {
    agentId: "agent-a", mode: "GEMINI", suiteId: "saved", scenarioIds: ["scenario-a"], ownerId: "attacker", userId: "attacker",
  } });
  assert.deepEqual(forged.result, { authorized: false, unavailable: "INVALID_REQUEST" });
  assert.equal(forged.effects.providerCalls, 0);
  assert.equal(forged.effects.persistenceCalls, 0);
});

test("scenario generation rejects authenticated requests with foreign resource or ownership fields before provider work", async () => {
  const ownerId = await verifiedOwner();
  assert.equal(ownerId, "verified-user");
  const providerCalls = { count: 0 };
  const validBody = { agentName: "Synthetic agent", count: 1 };
  const inputs = [
    { ...validBody, agentId: "another-users-agent" },
    { ...validBody, suiteId: "another-users-suite" },
    { ...validBody, scenarioId: "another-users-scenario" },
    { ...validBody, ownerId: "attacker" },
    { ...validBody, userId: "attacker" },
  ];

  for (const requestBody of inputs) {
    const result = await withValidatedScenarioGenerationRequest(requestBody, async () => {
      providerCalls.count++;
      return "provider response";
    });
    assert.deepEqual(result, { valid: false });
  }
  assert.equal(providerCalls.count, 0);
});
