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
import { AgentDocument } from "@/types/database";

const agentsCollection = collection(db, "agents");

export async function createAgentDocument(
  agent: Omit<AgentDocument, "id" | "createdAt" | "updatedAt">,
) {
  const ref = await addDoc(agentsCollection, {
    ...agent,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function getUserAgents(ownerId: string) {
  const q = query(agentsCollection, where("ownerId", "==", ownerId));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as AgentDocument[];
}

export async function deleteAgent(agentId: string) {
  await deleteDoc(doc(db, "agents", agentId));
}
