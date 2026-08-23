import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./client";
import { ScenarioDocument } from "@/types/database";

const scenariosCollection = collection(db, "scenarios");

export async function createScenarioDocuments(
  agentId: string,
  ownerId: string,
  scenarios: Omit<
    ScenarioDocument,
    "id" | "agentId" | "ownerId" | "createdAt"
  >[],
) {
  const ids: string[] = [];

  for (const scenario of scenarios) {
    const ref = await addDoc(scenariosCollection, {
      ...scenario,
      agentId,
      ownerId,
      createdAt: serverTimestamp(),
    });

    ids.push(ref.id);
  }

  return ids;
}

export async function getAgentScenarios(agentId: string, ownerId: string) {
  const q = query(
    scenariosCollection,
    where("agentId", "==", agentId),
    where("ownerId", "==", ownerId),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as ScenarioDocument[];
}

export async function deleteScenario(scenarioId: string) {
  await deleteDoc(doc(db, "scenarios", scenarioId));
}
