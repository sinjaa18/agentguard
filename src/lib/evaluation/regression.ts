import { demoVersions } from "@/data/demoVersions";
import { RegressionResult } from "@/types/version";

export function runRegression(): RegressionResult {
  const previous = demoVersions[1];
  const latest = demoVersions[2];

  const passed = previous.scenarios - latest.failed;
  const failed = latest.failed;

  const regressions = latest.toolSafety < previous.toolSafety ? 2 : 0;

  const newFailures =
    latest.failed > previous.failed ? latest.failed - previous.failed : 0;

  const criticalRegression = regressions > 0 && latest.toolSafety < 70;

  return {
    passed,
    failed,
    newFailures,
    regressions,
    deploymentBlocked: criticalRegression,
  };
}
