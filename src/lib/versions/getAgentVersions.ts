import { getAgentEvaluations } from "@/lib/firebase/evaluations";

export type VersionMetric = {
  version: string;
  reliability: number;
  taskSuccess: number;
  failed: number;
  total: number;
};

export async function getAgentVersions(
  agentId: string,
  ownerId: string,
): Promise<VersionMetric[]> {
  const evaluations = await getAgentEvaluations(agentId, ownerId);

  return evaluations
    .filter((evaluation) => evaluation.status === "COMPLETED")
    .map((evaluation, index) => ({
      version: `Run ${index + 1}`,
      reliability: evaluation.total
        ? Math.round((evaluation.passed / evaluation.total) * 100)
        : 0,
      taskSuccess: evaluation.total
        ? Math.round((evaluation.passed / evaluation.total) * 100)
        : 0,
      failed: evaluation.failed,
      total: evaluation.total,
    }));
}
