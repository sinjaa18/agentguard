import test from "node:test";
import assert from "node:assert/strict";
import { EvaluationRunRequestSchema, ScenarioGenerationRequestSchema } from "../src/lib/firebase/apiRequestSchemas.ts";

test("evaluation requests reject caller-supplied identity and ownership fields", () => {
  const valid = { agentId: "agent-a", mode: "DETERMINISTIC", suiteId: "saved", scenarioIds: ["scenario-a"] };
  assert.equal(EvaluationRunRequestSchema.safeParse(valid).success, true);
  for (const key of ["ownerId", "userId", "uid"]) {
    assert.equal(EvaluationRunRequestSchema.safeParse({ ...valid, [key]: "forged-user" }).success, false, `${key} must be rejected`);
  }
});

test("scenario generation rejects caller-supplied ownership and resource identifiers", () => {
  const valid = { agentName: "Synthetic agent", count: 1 };
  assert.equal(ScenarioGenerationRequestSchema.safeParse(valid).success, true);
  for (const key of ["ownerId", "userId", "uid", "agentId", "suiteId", "scenarioId"]) {
    assert.equal(ScenarioGenerationRequestSchema.safeParse({ ...valid, [key]: "forged-resource" }).success, false, `${key} must be rejected`);
  }
});
