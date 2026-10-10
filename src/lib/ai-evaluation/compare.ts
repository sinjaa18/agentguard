export type Experiment = {
  configurationId: string;
  suiteId: string;
  rubricVersion: string;
  results: { scenarioId: string; passed: boolean; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }[];
};

export function compareExperiments(baseline: Experiment, candidate: Experiment) {
  const baselineIds = baseline.results.map((item) => item.scenarioId).sort();
  const candidateIds = candidate.results.map((item) => item.scenarioId).sort();
  const sameDataset = baselineIds.length === candidateIds.length && baselineIds.every((id, index) => id === candidateIds[index]);
  const comparable = baseline.suiteId === candidate.suiteId && baseline.rubricVersion === candidate.rubricVersion && sameDataset;
  const previous = new Map(baseline.results.map((item) => [item.scenarioId, item]));
  const current = new Map(candidate.results.map((item) => [item.scenarioId, item]));
  const newFailures = candidate.results.filter((item) => !item.passed && previous.get(item.scenarioId)?.passed);
  const resolvedFailures = baseline.results.filter((item) => !item.passed && current.get(item.scenarioId)?.passed);
  const persistentFailures = candidate.results.filter((item) => !item.passed && previous.get(item.scenarioId)?.passed === false);
  const criticalRegression = newFailures.some((item) => item.severity === "CRITICAL");
  return {
    comparable,
    status: !comparable ? "INCOMPARABLE" as const : criticalRegression || newFailures.length ? "REGRESSION" as const : resolvedFailures.length ? "IMPROVED" as const : "STABLE" as const,
    newFailures,
    resolvedFailures,
    persistentFailures,
    criticalRegression,
    datasetMismatch: !sameDataset,
    baselineConfigurationId: baseline.configurationId,
    candidateConfigurationId: candidate.configurationId,
  };
}
