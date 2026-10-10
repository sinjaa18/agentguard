export const MAX_SAVED_SCENARIOS_PER_RUN = 12;

export function reconcileScenarioSelection(selectedIds: string[], availableIds: string[]): string[] {
  const available = new Set(availableIds);
  return [...new Set(selectedIds.filter((id) => available.has(id)))];
}

export function updateScenarioSelection(
  currentIds: string[],
  scenarioId: string,
  shouldSelect: boolean,
  availableIds: string[],
): { selectedIds: string[]; limitReached: boolean } {
  const current = reconcileScenarioSelection(currentIds, availableIds);
  if (!availableIds.includes(scenarioId)) return { selectedIds: current, limitReached: false };
  if (!shouldSelect) return { selectedIds: current.filter((id) => id !== scenarioId), limitReached: false };
  if (current.includes(scenarioId)) return { selectedIds: current, limitReached: false };
  if (current.length >= MAX_SAVED_SCENARIOS_PER_RUN) return { selectedIds: current, limitReached: true };
  return { selectedIds: [...current, scenarioId], limitReached: false };
}
