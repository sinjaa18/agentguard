import test from "node:test";
import assert from "node:assert/strict";
import { verifiedBearerUserId } from "../src/lib/firebase/bearerAuth.ts";

test("bearer authentication rejects missing, malformed, empty, and oversized credentials without verification", async () => {
  let calls = 0;
  const verifier = async () => {
    calls++;
    return { uid: "alice" };
  };

  for (const header of [null, "", "Basic abc", "Bearer", "Bearer ", `Bearer ${"x".repeat(8_001)}`]) {
    assert.equal(await verifiedBearerUserId(header, verifier), null, `expected rejection for ${String(header).slice(0, 30)}`);
  }
  assert.equal(calls, 0);
});

test("bearer authentication checks revocation and rejects invalid, expired, and revoked ID tokens", async () => {
  const errors = new Map([
    ["invalid", Object.assign(new Error("invalid"), { code: "auth/invalid-id-token" })],
    ["expired", Object.assign(new Error("expired"), { code: "auth/id-token-expired" })],
    ["revoked", Object.assign(new Error("revoked"), { code: "auth/id-token-revoked" })],
  ]);
  const checked = [];
  const verifier = async (token, checkRevoked) => {
    checked.push({ token, checkRevoked });
    if (errors.has(token)) throw errors.get(token);
    return { uid: "alice" };
  };

  for (const token of errors.keys()) assert.equal(await verifiedBearerUserId(`Bearer ${token}`, verifier), null);
  assert.deepEqual(checked, ["invalid", "expired", "revoked"].map((token) => ({ token, checkRevoked: true })));
});

test("a valid Firebase token supplies the authenticated UID", async () => {
  const verifyCalls = [];
  const uid = await verifiedBearerUserId("Bearer valid-token", async (token, checkRevoked) => {
    verifyCalls.push({ token, checkRevoked });
    return { uid: "verified-user" };
  });

  assert.equal(uid, "verified-user");
  assert.deepEqual(verifyCalls, [{ token: "valid-token", checkRevoked: true }]);
});
