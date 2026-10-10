import "server-only";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  diagnoseFirebaseAdminSetupFailure,
  FirebaseAdminSetupError,
  initializeFirebaseAdminApp,
  resolveFirebaseAdminConfiguration,
} from "./adminConfiguration";

export { FirebaseAdminSetupError };

function getAdminApp() {
  const config = resolveFirebaseAdminConfiguration(process.env);
  const existing = getApps()[0];
  if (existing) {
    if (config.projectId && existing.options.projectId && existing.options.projectId !== config.projectId) {
      const error = new FirebaseAdminSetupError("PROJECT_ID_MISMATCH");
      diagnoseFirebaseAdminSetupFailure(error);
      throw error;
    }
    return existing;
  }

  return initializeFirebaseAdminApp(() => {
    if (config.mode === "emulator") {
      // Firestore Admin requires an ADC credential implementation even though the
      // explicitly constrained local emulator does not need a service-account key.
      return initializeApp({ credential: applicationDefault(), projectId: config.projectId });
    }
    if (config.mode === "service-account") {
      return initializeApp({
        credential: cert({ projectId: config.projectId, clientEmail: config.clientEmail, privateKey: config.privateKey }),
        projectId: config.projectId,
      });
    }
    return initializeApp({ credential: applicationDefault(), projectId: config.projectId });
  });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}
