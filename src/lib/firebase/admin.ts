import "server-only";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export class FirebaseAdminSetupError extends Error {
  constructor(readonly category: "MISSING_CREDENTIALS" | "INVALID_CREDENTIALS" | "INVALID_EMULATOR_CONFIGURATION") {
    super(category);
    this.name = "FirebaseAdminSetupError";
  }
}

function getAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const emulatorMode = process.env.AGENTGUARD_FIREBASE_EMULATORS === "1";
  const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const hasEmulatorConfiguration = emulatorMode || Boolean(authEmulatorHost || firestoreEmulatorHost);

  if (hasEmulatorConfiguration) {
    const validLocalEmulatorConfig = process.env.NODE_ENV === "development"
      && emulatorMode
      && projectId === "demo-agentguard-local"
      && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "demo-agentguard-local"
      && authEmulatorHost === "127.0.0.1:9099"
      && firestoreEmulatorHost === "127.0.0.1:8180";
    if (!validLocalEmulatorConfig) throw new FirebaseAdminSetupError("INVALID_EMULATOR_CONFIGURATION");

    const existing = getApps()[0];
    if (existing) {
      if (existing.options.projectId !== projectId) throw new FirebaseAdminSetupError("INVALID_EMULATOR_CONFIGURATION");
      return existing;
    }

    // Firestore Admin requires its Application Default Credential implementation,
    // even though the local emulator does not need a service-account key. The strict
    // loopback/project checks above ensure SDK requests cannot escape to production.
    return initializeApp({ credential: applicationDefault(), projectId });
  }

  const existing = getApps()[0];
  if (existing) return existing;
  try {
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson) as { project_id?: string; client_email?: string; private_key?: string };
      if (!serviceAccount.client_email || !serviceAccount.private_key) throw new Error("invalid service account");
      return initializeApp({
        credential: cert({ projectId: serviceAccount.project_id, clientEmail: serviceAccount.client_email, privateKey: serviceAccount.private_key }),
        projectId: projectId ?? serviceAccount.project_id,
      });
    }
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT) {
      return initializeApp({ credential: applicationDefault(), projectId });
    }
  } catch {
    throw new FirebaseAdminSetupError("INVALID_CREDENTIALS");
  }
  throw new FirebaseAdminSetupError("MISSING_CREDENTIALS");
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}
