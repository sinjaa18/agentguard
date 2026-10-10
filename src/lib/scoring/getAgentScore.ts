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
    .sort((a, b) => firestoreMillis(b.createdAt) - firestoreMillis(a.createdAt))[0];

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

function firestoreMillis(value: unknown): number {
  if (!value || typeof value !== "object" || !("toMillis" in value) || typeof value.toMillis !== "function") return 0;
  const millis = value.toMillis();
  return Number.isFinite(millis) ? millis : 0;
}
