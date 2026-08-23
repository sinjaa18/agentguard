import {
  getAgentEvaluations,
  getAgentFailures,
} from "@/lib/firebase/evaluations";
import { getAgentScenarios } from "@/lib/firebase/scenarios";

export type DashboardData = {
  evaluations: number;
  scenarios: number;
  failures: number;
  criticalFailures: number;
  averageReliability: number;
  passed: number;
  failed: number;
  evaluationHistory: {
    id: string;
    passed: number;
    failed: number;
    total: number;
    status: string;
  }[];
};

export async function getDashboardData(
  agentId: string,
  ownerId: string,
): Promise<DashboardData> {
  const [evaluations, scenarios, failures] = await Promise.all([
    getAgentEvaluations(agentId, ownerId),
    getAgentScenarios(agentId, ownerId),
    getAgentFailures(agentId, ownerId),
  ]);

  const completed = evaluations.filter(
    (evaluation) => evaluation.status === "COMPLETED",
  );

  const passed = completed.reduce(
    (sum, evaluation) => sum + evaluation.passed,
    0,
  );

  const failed = completed.reduce(
    (sum, evaluation) => sum + evaluation.failed,
    0,
  );

  const total = completed.reduce(
    (sum, evaluation) => sum + evaluation.total,
    0,
  );

  const averageReliability = total ? Math.round((passed / total) * 100) : 0;

  return {
    evaluations: evaluations.length,
    scenarios: scenarios.length,
    failures: failures.length,
    criticalFailures: failures.filter(
      (failure) => failure.severity === "CRITICAL",
    ).length,
    averageReliability,
    passed,
    failed,
    evaluationHistory: completed.map((evaluation) => ({
      id: evaluation.id,
      passed: evaluation.passed,
      failed: evaluation.failed,
      total: evaluation.total,
      status: evaluation.status,
    })),
  };
}
