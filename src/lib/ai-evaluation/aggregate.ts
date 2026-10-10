export type Attempt = { passed: boolean; score: number | null; latencyMs: number | null };

export function aggregateAttempts(attempts: Attempt[]) {
  if (attempts.length === 0) throw new Error("At least one attempt is required.");
  const scores = attempts.flatMap((item) => item.score === null ? [] : [item.score]);
  const latencies = attempts.flatMap((item) => item.latencyMs === null ? [] : [item.latencyMs]).sort((a, b) => a - b);
  const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const variance = mean === null ? null : scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / scores.length;
  return {
    attempts: attempts.length,
    passed: attempts.filter((item) => item.passed).length,
    observedPassRate: attempts.filter((item) => item.passed).length / attempts.length,
    scoreMean: mean === null ? null : Number(mean.toFixed(2)),
    scorePopulationStdDev: variance === null ? null : Number(Math.sqrt(variance).toFixed(2)),
    latencyMs: latencies.length ? { sampleCount: latencies.length, median: percentile(latencies, 0.5), p95: percentile(latencies, 0.95) } : null,
    isDeterministic: new Set(attempts.map((item) => item.passed)).size === 1,
  };
}

function percentile(values: number[], p: number) {
  return values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)];
}
