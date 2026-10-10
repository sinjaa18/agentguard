export type IdTokenVerifier = (token: string, checkRevoked: true) => Promise<{ uid: string }>;

export function extractBearerToken(authorization: string | null): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length);
  return token && token.length <= 8_000 ? token : null;
}

export async function verifyFirebaseIdToken(token: string, verifyIdToken: IdTokenVerifier): Promise<string | null> {
  try {
    const decoded = await verifyIdToken(token, true);
    return typeof decoded.uid === "string" && decoded.uid.length > 0 ? decoded.uid : null;
  } catch {
    return null;
  }
}

/** Validate and verify a Firebase bearer token without coupling the caller to Admin SDK setup. */
export async function verifiedBearerUserId(
  authorization: string | null,
  verifyIdToken: IdTokenVerifier,
): Promise<string | null> {
  const token = extractBearerToken(authorization);
  return token ? verifyFirebaseIdToken(token, verifyIdToken) : null;
}
