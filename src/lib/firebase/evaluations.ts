import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "./client";

import {
  EvaluationDocument,
  ExecutionTraceDocument,
  FailureDocument,
} from "@/types/database";

const evaluationsCollection = collection(db, "evaluations");

const tracesCollection = collection(db, "executionTraces");

const failuresCollection = collection(db, "failures");

export async function createEvaluation(
  evaluation: Omit<EvaluationDocument, "id" | "createdAt">,
) {
  const ref = await addDoc(evaluationsCollection, {
    ...evaluation,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function createExecutionTrace(
  trace: Omit<ExecutionTraceDocument, "id" | "createdAt">,
) {
  const ref = await addDoc(tracesCollection, {
    ...trace,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function createFailure(
  failure: Omit<FailureDocument, "id" | "createdAt">,
) {
  const ref = await addDoc(failuresCollection, {
    ...failure,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function getAgentEvaluations(agentId: string, ownerId: string) {
  const q = query(
    evaluationsCollection,
    where("agentId", "==", agentId),
    where("ownerId", "==", ownerId),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as EvaluationDocument[];
}

export async function getEvaluation(evaluationId: string, ownerId: string) {
  const q = query(
    evaluationsCollection,
    where("__name__", "==", evaluationId),
    where("ownerId", "==", ownerId),
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const document = snapshot.docs[0];

  return {
    id: document.id,
    ...document.data(),
  } as EvaluationDocument;
}

export async function getEvaluationTraces(
  evaluationId: string,
  ownerId: string,
) {
  const q = query(
    tracesCollection,
    where("evaluationId", "==", evaluationId),
    where("ownerId", "==", ownerId),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as ExecutionTraceDocument[];
}

export async function getEvaluationFailures(
  evaluationId: string,
  ownerId: string,
) {
  const q = query(
    failuresCollection,
    where("evaluationId", "==", evaluationId),
    where("ownerId", "==", ownerId),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as FailureDocument[];
}

export async function getAgentFailures(agentId: string, ownerId: string) {
  const q = query(
    failuresCollection,
    where("agentId", "==", agentId),
    where("ownerId", "==", ownerId),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as FailureDocument[];
}
