import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
let environment;
let firestore;
let rulesTesting;

before(async (context) => {
  if (!emulatorHost) return context.skip("Set FIRESTORE_EMULATOR_HOST or use npm run test:rules.");
  const require = createRequire(import.meta.url);
  firestore = require("firebase/firestore");
  rulesTesting = require("@firebase/rules-unit-testing");
  const [host, port] = emulatorHost.split(":");
  environment = await rulesTesting.initializeTestEnvironment({
    projectId: "demo-agentguard-local",
    firestore: { host, port: Number(port), rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8") },
  });
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await firestore.setDoc(firestore.doc(db, "agents/agent-a"), { ownerId: "alice" });
    await firestore.setDoc(firestore.doc(db, "agents/agent-b"), { ownerId: "bob" });
    await firestore.setDoc(firestore.doc(db, "scenarios/scenario-a"), { ownerId: "alice", agentId: "agent-a" });
    await firestore.setDoc(firestore.doc(db, "evaluations/eval-a"), { ownerId: "alice", agentId: "agent-a" });
    await firestore.setDoc(firestore.doc(db, "evaluations/eval-b"), { ownerId: "bob", agentId: "agent-b" });
    await firestore.setDoc(firestore.doc(db, "executionTraces/trace-a"), { ownerId: "alice", evaluationId: "eval-a", agentId: "agent-a" });
    await firestore.setDoc(firestore.doc(db, "executionTraces/trace-wrong-agent"), { ownerId: "alice", evaluationId: "eval-a", agentId: "agent-b" });
    await firestore.setDoc(firestore.doc(db, "executionTraces/trace-wrong-owner"), { ownerId: "alice", evaluationId: "eval-b", agentId: "agent-b" });
    await firestore.setDoc(firestore.doc(db, "failures/failure-a"), { ownerId: "alice", evaluationId: "eval-a", agentId: "agent-a" });
    await firestore.setDoc(firestore.doc(db, "failures/failure-wrong-agent"), { ownerId: "alice", evaluationId: "eval-a", agentId: "agent-b" });
    await firestore.setDoc(firestore.doc(db, "failures/failure-wrong-owner"), { ownerId: "alice", evaluationId: "eval-b", agentId: "agent-b" });
  });
});

after(async () => environment?.cleanup());

test("Firestore rules enforce user ownership, parent relationships, and server-owned result writes", async (context) => {
  if (!environment) return context.skip("Firestore emulator is not configured.");
  const anonymous = environment.unauthenticatedContext().firestore();
  const alice = environment.authenticatedContext("alice").firestore();
  const bob = environment.authenticatedContext("bob").firestore();

  for (const path of ["agents/agent-a", "scenarios/scenario-a", "evaluations/eval-a", "executionTraces/trace-a", "failures/failure-a"]) {
    await rulesTesting.assertFails(firestore.getDoc(firestore.doc(anonymous, path)));
  }
  await rulesTesting.assertFails(firestore.setDoc(firestore.doc(anonymous, "agents/new-agent"), { ownerId: "anonymous" }));
  await rulesTesting.assertFails(firestore.setDoc(firestore.doc(anonymous, "scenarios/new-scenario"), { ownerId: "anonymous", agentId: "agent-a" }));
  await rulesTesting.assertFails(firestore.setDoc(firestore.doc(anonymous, "evaluations/new-evaluation"), { ownerId: "anonymous", agentId: "agent-a" }));
  await rulesTesting.assertFails(firestore.setDoc(firestore.doc(anonymous, "executionTraces/new-trace"), { ownerId: "anonymous", evaluationId: "eval-a", agentId: "agent-a" }));
  await rulesTesting.assertFails(firestore.setDoc(firestore.doc(anonymous, "failures/new-failure"), { ownerId: "anonymous", evaluationId: "eval-a", agentId: "agent-a" }));

  await rulesTesting.assertSucceeds(firestore.getDoc(firestore.doc(alice, "agents/agent-a")));
  await rulesTesting.assertFails(firestore.getDoc(firestore.doc(bob, "agents/agent-a")));
  await rulesTesting.assertSucceeds(firestore.getDoc(firestore.doc(alice, "scenarios/scenario-a")));
  await rulesTesting.assertFails(firestore.getDoc(firestore.doc(bob, "scenarios/scenario-a")));
  await rulesTesting.assertFails(firestore.setDoc(firestore.doc(alice, "scenarios/under-bobs-agent"), { ownerId: "alice", agentId: "agent-b" }));
  await rulesTesting.assertFails(firestore.updateDoc(firestore.doc(alice, "scenarios/scenario-a"), { ownerId: "bob" }));
  await rulesTesting.assertFails(firestore.updateDoc(firestore.doc(alice, "scenarios/scenario-a"), { agentId: "agent-b" }));

  await rulesTesting.assertSucceeds(firestore.getDoc(firestore.doc(alice, "evaluations/eval-a")));
  await rulesTesting.assertFails(firestore.getDoc(firestore.doc(bob, "evaluations/eval-a")));
  await rulesTesting.assertFails(firestore.getDoc(firestore.doc(alice, "evaluations/eval-b")));
  await rulesTesting.assertSucceeds(firestore.getDoc(firestore.doc(alice, "executionTraces/trace-a")));
  await rulesTesting.assertFails(firestore.getDoc(firestore.doc(bob, "executionTraces/trace-a")));
  await rulesTesting.assertFails(firestore.getDoc(firestore.doc(alice, "executionTraces/trace-wrong-agent")));
  await rulesTesting.assertFails(firestore.getDoc(firestore.doc(alice, "executionTraces/trace-wrong-owner")));
  await rulesTesting.assertSucceeds(firestore.getDoc(firestore.doc(alice, "failures/failure-a")));
  await rulesTesting.assertFails(firestore.getDoc(firestore.doc(bob, "failures/failure-a")));
  await rulesTesting.assertFails(firestore.getDoc(firestore.doc(alice, "failures/failure-wrong-agent")));
  await rulesTesting.assertFails(firestore.getDoc(firestore.doc(alice, "failures/failure-wrong-owner")));
  await rulesTesting.assertSucceeds(firestore.getDocs(firestore.query(
    firestore.collection(alice, "executionTraces"),
    firestore.where("evaluationId", "==", "eval-a"),
    firestore.where("ownerId", "==", "alice"),
    firestore.where("agentId", "==", "agent-a"),
  )));
  await rulesTesting.assertFails(firestore.getDocs(firestore.query(
    firestore.collection(bob, "evaluations"),
    firestore.where("ownerId", "==", "alice"),
  )));
  await rulesTesting.assertFails(firestore.getDocs(firestore.query(
    firestore.collection(bob, "scenarios"),
    firestore.where("ownerId", "==", "alice"),
  )));
  await rulesTesting.assertFails(firestore.getDocs(firestore.query(
    firestore.collection(bob, "executionTraces"),
    firestore.where("evaluationId", "==", "eval-a"),
    firestore.where("ownerId", "==", "alice"),
    firestore.where("agentId", "==", "agent-a"),
  )));
  await rulesTesting.assertFails(firestore.getDocs(firestore.query(
    firestore.collection(bob, "failures"),
    firestore.where("evaluationId", "==", "eval-a"),
    firestore.where("ownerId", "==", "alice"),
    firestore.where("agentId", "==", "agent-a"),
  )));
  await rulesTesting.assertSucceeds(firestore.getDocs(firestore.query(
    firestore.collection(alice, "failures"),
    firestore.where("evaluationId", "==", "eval-a"),
    firestore.where("ownerId", "==", "alice"),
    firestore.where("agentId", "==", "agent-a"),
  )));
  await rulesTesting.assertFails(firestore.setDoc(firestore.doc(alice, "evaluations/eval-a"), { ownerId: "alice" }));
  await rulesTesting.assertFails(firestore.updateDoc(firestore.doc(alice, "evaluations/eval-a"), { ownerId: "bob" }));
  await rulesTesting.assertFails(firestore.deleteDoc(firestore.doc(alice, "evaluations/eval-a")));
  await rulesTesting.assertFails(firestore.setDoc(firestore.doc(alice, "failures/new-failure"), { ownerId: "alice", evaluationId: "eval-a", agentId: "agent-a" }));
  await rulesTesting.assertFails(firestore.updateDoc(firestore.doc(alice, "failures/failure-a"), { title: "changed" }));
  await rulesTesting.assertFails(firestore.deleteDoc(firestore.doc(alice, "failures/failure-a")));
  await rulesTesting.assertFails(firestore.setDoc(firestore.doc(alice, "executionTraces/trace-a"), { ownerId: "alice" }));
  await rulesTesting.assertFails(firestore.updateDoc(firestore.doc(alice, "executionTraces/trace-a"), { ownerId: "bob" }));
  await rulesTesting.assertFails(firestore.deleteDoc(firestore.doc(alice, "executionTraces/trace-a")));
});
