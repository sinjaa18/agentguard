import test from "node:test";
import assert from "node:assert/strict";
import { EvaluationRunRequestSchema, ScenarioGenerationRequestSchema, evaluationRunValidationError } from "../src/lib/firebase/apiRequestSchemas.ts";

test("evaluation requests reject caller-supplied identity and ownership fields", () => {
  const valid = { agentId: "agent-a", mode: "DETERMINISTIC", suiteId: "saved", scenarioIds: ["scenario-a"] };
  assert.equal(EvaluationRunRequestSchema.safeParse(valid).success, true);
  for (const key of ["ownerId", "userId", "uid"]) {
    assert.equal(EvaluationRunRequestSchema.safeParse({ ...valid, [key]: "forged-user" }).success, false, `${key} must be rejected`);
  }
});

test("saved evaluation requests accept at most 12 scenarios and return an actionable count error", () => {
  const base = { agentId: "agent-a", mode: "DETERMINISTIC", suiteId: "saved" };
  assert.equal(EvaluationRunRequestSchema.safeParse({ ...base, scenarioIds: Array.from({ length: 12 }, (_, index) => `scenario-${index}`) }).success, true);
  const tooMany = EvaluationRunRequestSchema.safeParse({ ...base, scenarioIds: Array.from({ length: 13 }, (_, index) => `scenario-${index}`) });
  assert.equal(tooMany.success, false);
  if (!tooMany.success) {
    assert.deepEqual(evaluationRunValidationError(tooMany.error), {
      error: "TOO_MANY_SCENARIOS",
      message: "Select no more than 12 saved scenarios per evaluation.",
    });
  }

  const noneSelected = EvaluationRunRequestSchema.safeParse({ ...base, scenarioIds: [] });
  assert.equal(noneSelected.success, false);
  if (!noneSelected.success) {
    assert.deepEqual(evaluationRunValidationError(noneSelected.error), {
      error: "NO_SCENARIOS_SELECTED",
      message: "Choose at least one saved scenario to run this evaluation.",
    });
  }
});

test("scenario generation rejects caller-supplied ownership and resource identifiers", () => {
  const valid = { agentName: "Synthetic agent", count: 1 };
  assert.equal(ScenarioGenerationRequestSchema.safeParse(valid).success, true);
  for (const key of ["ownerId", "userId", "uid", "agentId", "suiteId", "scenarioId"]) {
    assert.equal(ScenarioGenerationRequestSchema.safeParse({ ...valid, [key]: "forged-resource" }).success, false, `${key} must be rejected`);
  }
});
