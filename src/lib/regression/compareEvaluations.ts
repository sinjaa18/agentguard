import { FailureDocument, EvaluationDocument } from "@/types/database";

export type RegressionResult = {
  previousReliability: number;
  currentReliability: number;
  reliabilityDelta: number;
  previousFailures: number;
  currentFailures: number;
  newFailures: FailureDocument[];
  resolvedFailures: FailureDocument[];
  status: "REGRESSION" | "IMPROVED" | "STABLE";
};

export function compareEvaluations(
  previous: EvaluationDocument,
  current: EvaluationDocument,
  previousFailures: FailureDocument[],
  currentFailures: FailureDocument[],
): RegressionResult {
  const previousReliability = previous.total
    ? Math.round((previous.passed / previous.total) * 100)
    : 0;

  const currentReliability = current.total
    ? Math.round((current.passed / current.total) * 100)
    : 0;

  const previousIds = new Set(
    previousFailures.map((f) => f.category + "::" + f.title),
  );

  const currentIds = new Set(
    currentFailures.map((f) => f.category + "::" + f.title),
  );

  const newFailures = currentFailures.filter(
    (failure) => !previousIds.has(failure.category + "::" + failure.title),
  );

  const resolvedFailures = previousFailures.filter(
    (failure) => !currentIds.has(failure.category + "::" + failure.title),
  );

  const reliabilityDelta = currentReliability - previousReliability;

  let status: "REGRESSION" | "IMPROVED" | "STABLE" = "STABLE";

  if (reliabilityDelta < 0 || newFailures.length > 0) {
    status = "REGRESSION";
  } else if (reliabilityDelta > 0 || resolvedFailures.length > 0) {
    status = "IMPROVED";
  }

  return {
    previousReliability,
    currentReliability,
    reliabilityDelta,
    previousFailures: previousFailures.length,
    currentFailures: currentFailures.length,
    newFailures,
    resolvedFailures,
    status,
  };
}
