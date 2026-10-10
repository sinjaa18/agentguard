import test from "node:test";
import assert from "node:assert/strict";
import {
  FirebaseAdminSetupError,
  initializeFirebaseAdminApp,
  resolveFirebaseAdminConfiguration,
} from "../src/lib/firebase/adminConfiguration.ts";

function diagnostics() {
  const events = [];
  return { events, log: (event) => events.push(event) };
}

test("missing Firebase Admin configuration is categorized without logging configuration values", () => {
  const captured = diagnostics();
  assert.throws(
    () => resolveFirebaseAdminConfiguration({ NODE_ENV: "production" }, captured.log),
    (error) => error instanceof FirebaseAdminSetupError && error.category === "MISSING_CONFIGURATION",
  );
  assert.deepEqual(captured.events, [{ category: "MISSING_CONFIGURATION", firebaseCode: null }]);
});

test("malformed service-account JSON is distinguished without logging its contents", () => {
  const captured = diagnostics();
  const privateMarker = "PRIVATE-KEY-MUST-NOT-APPEAR";
  assert.throws(
    () => resolveFirebaseAdminConfiguration({ FIREBASE_SERVICE_ACCOUNT_JSON: `{\"private_key\":\"${privateMarker}` }, captured.log),
    (error) => error instanceof FirebaseAdminSetupError && error.category === "MALFORMED_SERVICE_ACCOUNT_JSON",
  );
  assert.deepEqual(captured.events, [{ category: "MALFORMED_SERVICE_ACCOUNT_JSON", firebaseCode: null }]);
  assert.equal(JSON.stringify(captured.events).includes(privateMarker), false);
});

test("valid JSON with a non-object or incomplete service account is still classified as malformed", () => {
  for (const value of ["null", "[]", "\"text\"", "42", "{}", JSON.stringify({ project_id: "project-a" })]) {
    const captured = diagnostics();
    assert.throws(
      () => resolveFirebaseAdminConfiguration({ FIREBASE_SERVICE_ACCOUNT_JSON: value }, captured.log),
      (error) => error instanceof FirebaseAdminSetupError && error.category === "MALFORMED_SERVICE_ACCOUNT_JSON",
      `Expected malformed category for JSON value ${value}`,
    );
    assert.deepEqual(captured.events, [{ category: "MALFORMED_SERVICE_ACCOUNT_JSON", firebaseCode: null }]);
  }
});

test("Firebase client and Admin project ID mismatch is rejected", () => {
  const captured = diagnostics();
  assert.throws(
    () => resolveFirebaseAdminConfiguration({
      FIREBASE_PROJECT_ID: "agentguard-server-project",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "agentguard-client-project",
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        project_id: "agentguard-server-project", client_email: "service@example.invalid", private_key: "private-value",
      }),
    }, captured.log),
    (error) => error instanceof FirebaseAdminSetupError && error.category === "PROJECT_ID_MISMATCH",
  );
  assert.deepEqual(captured.events, [{ category: "PROJECT_ID_MISMATCH", firebaseCode: null }]);
});

test("Firebase Admin initialization failure logs only its safe category and Firebase code", () => {
  const captured = diagnostics();
  const secret = "do-not-log-this-private-key";
  assert.throws(
    () => initializeFirebaseAdminApp(() => {
      const error = new Error(`initialization failed with ${secret}`);
      error.code = "app/invalid-credential";
      throw error;
    }, captured.log),
    (error) => error instanceof FirebaseAdminSetupError
      && error.category === "INITIALIZATION_FAILED"
      && error.firebaseCode === "app/invalid-credential",
  );
  assert.deepEqual(captured.events, [{ category: "INITIALIZATION_FAILED", firebaseCode: "app/invalid-credential" }]);
  assert.equal(JSON.stringify(captured.events).includes(secret), false);
});

test("Auth service-access errors are not reclassified as Firebase Admin app initialization failures", () => {
  const captured = diagnostics();
  const authError = Object.assign(new Error("private diagnostic text"), { code: "auth/invalid-credential" });
  assert.throws(() => {
    const app = initializeFirebaseAdminApp(() => ({ name: "initialized-app" }), captured.log);
    const getAuth = (adminApp) => {
      assert.equal(adminApp.name, "initialized-app");
      throw authError;
    };
    return getAuth(app); // Mirrors calling getAuth(app) after app initialization.
  }, (error) => error === authError);
  assert.deepEqual(captured.events, []);
});

test("production emulator settings fail closed and a matching service account resolves safely", () => {
  const captured = diagnostics();
  assert.throws(
    () => resolveFirebaseAdminConfiguration({
      NODE_ENV: "production", AGENTGUARD_FIREBASE_EMULATORS: "1", FIREBASE_PROJECT_ID: "demo-agentguard-local",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-agentguard-local", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8180",
    }, captured.log),
    (error) => error instanceof FirebaseAdminSetupError && error.category === "INVALID_EMULATOR_CONFIGURATION",
  );

  const config = resolveFirebaseAdminConfiguration({
    FIREBASE_PROJECT_ID: "agentguard-project",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "agentguard-project",
    FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
      project_id: "agentguard-project", client_email: "service@example.invalid", private_key: "secret-key",
    }),
  }, captured.log);
  assert.deepEqual(config, {
    mode: "service-account", projectId: "agentguard-project", clientEmail: "service@example.invalid", privateKey: "secret-key",
  });
});
