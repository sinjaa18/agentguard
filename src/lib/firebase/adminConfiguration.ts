export type FirebaseAdminFailureCategory =
  | "MISSING_CONFIGURATION"
  | "MALFORMED_SERVICE_ACCOUNT_JSON"
  | "PROJECT_ID_MISMATCH"
  | "INVALID_EMULATOR_CONFIGURATION"
  | "INITIALIZATION_FAILED";

export type FirebaseAdminEnvironment = Record<string, string | undefined>;

export type FirebaseAdminConfiguration =
  | { mode: "emulator"; projectId: string }
  | {
      mode: "service-account";
      projectId: string;
      clientEmail: string;
      privateKey: string;
    }
  | { mode: "application-default"; projectId?: string };

export class FirebaseAdminSetupError extends Error {
  readonly category: FirebaseAdminFailureCategory;
  readonly firebaseCode: string | null;

  constructor(
    category: FirebaseAdminFailureCategory,
    firebaseCode: string | null = null,
  ) {
    super(category);
    this.name = "FirebaseAdminSetupError";
    this.category = category;
    this.firebaseCode = firebaseCode;
  }
}

type SafeDiagnostic = { category: FirebaseAdminFailureCategory; firebaseCode: string | null };
type DiagnosticLogger = (diagnostic: SafeDiagnostic) => void;

function logDiagnostic({ category, firebaseCode }: SafeDiagnostic) {
  console.error("Firebase Admin setup failure", { category, firebaseCode });
}

function firebaseErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^(?:app|auth|firestore|storage|database)\/[a-z0-9-]{1,80}$/.test(code)
    ? code
    : null;
}

function fail(category: FirebaseAdminFailureCategory, logger: DiagnosticLogger, cause?: unknown): never {
  const error = new FirebaseAdminSetupError(category, firebaseErrorCode(cause));
  logger({ category: error.category, firebaseCode: error.firebaseCode });
  throw error;
}

export function resolveFirebaseAdminConfiguration(
  env: FirebaseAdminEnvironment,
  logger: DiagnosticLogger = logDiagnostic,
): FirebaseAdminConfiguration {
  const projectCandidates = [
    env.FIREBASE_PROJECT_ID,
    env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    env.GOOGLE_CLOUD_PROJECT,
    env.GCLOUD_PROJECT,
  ].filter((value): value is string => Boolean(value));
  if (new Set(projectCandidates).size > 1) fail("PROJECT_ID_MISMATCH", logger);

  const projectId = projectCandidates[0];
  const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const emulatorMode = env.AGENTGUARD_FIREBASE_EMULATORS === "1";
  const hasEmulatorConfiguration = emulatorMode
    || Boolean(env.FIREBASE_AUTH_EMULATOR_HOST || env.FIRESTORE_EMULATOR_HOST);

  if (hasEmulatorConfiguration) {
    if (projectId && projectId !== "demo-agentguard-local") fail("PROJECT_ID_MISMATCH", logger);
    const valid = env.NODE_ENV === "development"
      && emulatorMode
      && projectId === "demo-agentguard-local"
      && env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "demo-agentguard-local"
      && env.FIREBASE_AUTH_EMULATOR_HOST === "127.0.0.1:9099"
      && env.FIRESTORE_EMULATOR_HOST === "127.0.0.1:8180";
    if (!valid) fail("INVALID_EMULATOR_CONFIGURATION", logger);
    return { mode: "emulator", projectId: "demo-agentguard-local" };
  }

  if (serviceAccountJson) {
    let parsedServiceAccount: unknown;
    try {
      parsedServiceAccount = JSON.parse(serviceAccountJson);
    } catch {
      fail("MALFORMED_SERVICE_ACCOUNT_JSON", logger);
    }
    if (!parsedServiceAccount || typeof parsedServiceAccount !== "object" || Array.isArray(parsedServiceAccount)) {
      fail("MALFORMED_SERVICE_ACCOUNT_JSON", logger);
    }
    const serviceAccount = parsedServiceAccount as { project_id?: unknown; client_email?: unknown; private_key?: unknown };
    if (
      typeof serviceAccount!.project_id !== "string"
      || !serviceAccount!.project_id.trim()
      || typeof serviceAccount!.client_email !== "string"
      || !serviceAccount!.client_email.trim()
      || typeof serviceAccount!.private_key !== "string"
      || !serviceAccount!.private_key.trim()
    ) fail("MALFORMED_SERVICE_ACCOUNT_JSON", logger);
    if (projectId && projectId !== serviceAccount!.project_id) fail("PROJECT_ID_MISMATCH", logger);
    return {
      mode: "service-account",
      projectId: projectId ?? serviceAccount!.project_id as string,
      clientEmail: serviceAccount!.client_email,
      privateKey: serviceAccount!.private_key,
    };
  }

  if (env.GOOGLE_APPLICATION_CREDENTIALS || env.GOOGLE_CLOUD_PROJECT || env.GCLOUD_PROJECT) {
    return { mode: "application-default", projectId };
  }

  fail("MISSING_CONFIGURATION", logger);
}

export function initializeFirebaseAdminApp<T>(
  initialize: () => T,
  logger: DiagnosticLogger = logDiagnostic,
): T {
  try {
    return initialize();
  } catch (error) {
    if (error instanceof FirebaseAdminSetupError) throw error;
    fail("INITIALIZATION_FAILED", logger, error);
  }
}

export function diagnoseFirebaseAdminSetupFailure(error: unknown, logger: DiagnosticLogger = logDiagnostic) {
  const category = error instanceof FirebaseAdminSetupError ? error.category : "INITIALIZATION_FAILED";
  const firebaseCode = error instanceof FirebaseAdminSetupError ? error.firebaseCode : firebaseErrorCode(error);
  logger({ category, firebaseCode });
}
