import "server-only";
import type { NextRequest } from "next/server";
import { getAdminAuth } from "./admin";
import { extractBearerToken, verifyFirebaseIdToken } from "./bearerAuth";

export async function verifiedRequestUserId(request: NextRequest): Promise<string | null> {
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) return null;
  const auth = getAdminAuth();
  return verifyFirebaseIdToken(token, (value, checkRevoked) => auth.verifyIdToken(value, checkRevoked));
}
