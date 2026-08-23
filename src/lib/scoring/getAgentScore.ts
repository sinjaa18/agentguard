import {
  getAgentEvaluations,
  getAgentFailures,
} from "@/lib/firebase/evaluations";
import { calculateFirestoreScore, FirestoreScore } from "./firestoreScore";

export async function getAgentScore(
  agentId: string,
  ownerId: string,
): Promise<FirestoreScore> {
  const [evaluations, failures] = await Promise.all([
    getAgentEvaluations(agentId, ownerId),
    getAgentFailures(agentId, ownerId),
  ]);

  if (!evaluations.length) {
    return calculateFirestoreScore(0, 0, failures);
  }

  const latest = evaluations
    .filter((evaluation) => evaluation.status === "COMPLETED")
    .sort((a, b) => {
      const aTime =
        a.createdAt && typeof (a.createdAt as any).toMillis === "function"
          ? (a.createdAt as any).toMillis()
          : 0;

      const bTime =
        b.createdAt && typeof (b.createdAt as any).toMillis === "function"
          ? (b.createdAt as any).toMillis()
          : 0;

      return bTime - aTime;
    })[0];

  if (!latest) {
    return calculateFirestoreScore(0, 0, failures);
  }

  const evaluationFailures = failures.filter(
    (failure) => failure.evaluationId === latest.id,
  );

  return calculateFirestoreScore(
    latest.total,
    latest.passed,
    evaluationFailures,
  );
}
