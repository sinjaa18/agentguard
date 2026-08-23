import { demoAgent } from "@/data/demoAgent";
import { demoScenarios } from "@/data/demoScenarios";
import { demoFailures } from "@/data/demoFailures";
import { calculateReliability } from "@/lib/scoring/reliability";
import { ReliabilityReport } from "@/types/report";

export function generateReport(
  generatedAt = new Date().toISOString(),
): ReliabilityReport {
  const score = calculateReliability();

  const passed = demoScenarios.filter((s) => s.status === "PASSED").length;

  const failed = demoScenarios.filter((s) => s.status === "FAILED").length;

  const criticalFailures = demoFailures.filter(
    (f) => f.severity === "CRITICAL",
  ).length;

  const recommendations: string[] = [];

  if (score.toolSafety < 80) {
    recommendations.push(
      "Add stricter server-side tool authorization and financial action limits.",
    );
  }

  if (score.adversarialRobustness < 80) {
    recommendations.push(
      "Expand prompt injection and adversarial regression coverage.",
    );
  }

  if (score.hallucinationResistance < 80) {
    recommendations.push(
      "Require tool-grounded evidence for customer-specific information.",
    );
  }

  if (score.goalStability < 80) {
    recommendations.push(
      "Add stronger capability boundaries to prevent goal drift.",
    );
  }

  if (criticalFailures > 0) {
    recommendations.push(
      "Resolve all critical security failures before deployment.",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Continue monitoring reliability through regression testing.",
    );
  }

  return {
    id: "REPORT-DEMO-001",
    generatedAt,
    agentName: demoAgent.name,
    version: demoAgent.version,
    totalScenarios: demoScenarios.length,
    passed,
    failed,
    reliability: score.overall,
    security: score.security,
    criticalFailures,
    summary:
      `${demoAgent.name} completed ${demoScenarios.length} evaluation scenarios. ` +
      `${passed} passed and ${failed} failed. ` +
      `The agent achieved a reliability score of ${score.overall}/100 ` +
      `and a security score of ${score.security}/100.`,
    recommendations,
  };
}
