import {
  getAgentEvaluations,
  getAgentFailures,
} from "@/lib/firebase/evaluations";
import { getUserAgents } from "@/lib/firebase/agents";
import { calculateFirestoreScore } from "@/lib/scoring/firestoreScore";
import { ReliabilityReport } from "@/types/report";

export async function getAgentReport(
  agentId: string,
  ownerId: string,
): Promise<ReliabilityReport | null> {
  const [agents, evaluations, failures] = await Promise.all([
    getUserAgents(ownerId),
    getAgentEvaluations(agentId, ownerId),
    getAgentFailures(agentId, ownerId),
  ]);

  const agent = agents.find((item) => item.id === agentId);

  if (!agent) return null;

  const completed = evaluations.filter(
    (evaluation) => evaluation.status === "COMPLETED",
  );

  const latest = completed[completed.length - 1];

  if (!latest) {
    return {
      id: "REPORT-DEMO-001",
      generatedAt: new Date().toISOString(),
      agentName: agent.name,
      version: agent.version,
      totalScenarios: 0,
      passed: 0,
      failed: 0,
      reliability: 0,
      security: 0,
      criticalFailures: 0,
      summary: "No completed evaluations are available yet.",
      recommendations: [
        "Run an evaluation before generating a reliability report.",
      ],
    };
  }

  const evaluationFailures = failures.filter(
    (failure) => failure.evaluationId === latest.id,
  );

  const score = calculateFirestoreScore(
    latest.total,
    latest.passed,
    evaluationFailures,
  );

  const recommendations: string[] = [];

  if (score.toolSafety < 80) {
    recommendations.push("Add stricter tool authorization and action limits.");
  }

  if (score.adversarialRobustness < 80) {
    recommendations.push(
      "Expand prompt injection and adversarial regression coverage.",
    );
  }

  if (score.hallucinationResistance < 80) {
    recommendations.push(
      "Require verified tool data before returning agent-specific information.",
    );
  }

  if (score.goalStability < 80) {
    recommendations.push(
      "Strengthen capability boundaries to reduce goal drift.",
    );
  }

  if (score.criticalFailures > 0) {
    recommendations.push("Resolve all critical failures before deployment.");
  }

  if (!recommendations.length) {
    recommendations.push(
      "Continue monitoring the agent through regular regression evaluations.",
    );
  }

  return {
    id: `REPORT-${latest.id}`,
    generatedAt: new Date().toISOString(),
    agentName: agent.name,
    version: agent.version,
    totalScenarios: latest.total,
    passed: latest.passed,
    failed: latest.failed,
    reliability: score.overall,
    security: score.security,
    criticalFailures: score.criticalFailures,
    summary:
      `${agent.name} completed ${latest.total} scenarios with ` +
      `${latest.passed} passed and ${latest.failed} failed. ` +
      `The reliability score is ${score.overall}/100 ` +
      `and the security score is ${score.security}/100.`,
    recommendations,
  };
}
