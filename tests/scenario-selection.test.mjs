import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SAVED_SCENARIOS_PER_RUN,
  reconcileScenarioSelection,
  updateScenarioSelection,
} from "../src/lib/evaluation/scenarioSelection.ts";

test("saved scenario selection allows adding and removing individual scenarios up to the limit", () => {
  const available = Array.from({ length: 45 }, (_, index) => `scenario-${index}`);
  let selected = [];
  for (const scenarioId of available.slice(0, MAX_SAVED_SCENARIOS_PER_RUN)) {
    const result = updateScenarioSelection(selected, scenarioId, true, available);
    assert.equal(result.limitReached, false);
    selected = result.selectedIds;
  }
  assert.equal(selected.length, 12);

  const blocked = updateScenarioSelection(selected, available[12], true, available);
  assert.equal(blocked.limitReached, true);
  assert.deepEqual(blocked.selectedIds, selected);

  const deselected = updateScenarioSelection(selected, available[0], false, available);
  assert.equal(deselected.limitReached, false);
  assert.equal(deselected.selectedIds.includes(available[0]), false);
  const replacement = updateScenarioSelection(deselected.selectedIds, available[12], true, available);
  assert.equal(replacement.limitReached, false);
  assert.equal(replacement.selectedIds.includes(available[12]), true);
  assert.equal(replacement.selectedIds.length, 12);
});

test("scenario-list reconciliation removes stale and duplicate IDs without silently truncating selection", () => {
  const selected = ["scenario-a", "stale", "scenario-a", "scenario-b"];
  assert.deepEqual(reconcileScenarioSelection(selected, ["scenario-a", "scenario-b"]), ["scenario-a", "scenario-b"]);
  const oversizedSelection = Array.from({ length: 15 }, (_, index) => `scenario-${index}`);
  assert.deepEqual(reconcileScenarioSelection(oversizedSelection, oversizedSelection), oversizedSelection);
  assert.equal(updateScenarioSelection(oversizedSelection, "scenario-15", true, [...oversizedSelection, "scenario-15"]).limitReached, true);
  assert.deepEqual(updateScenarioSelection(["stale"], "stale", true, ["scenario-a"]).selectedIds, []);
});
