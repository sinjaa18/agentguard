import { detectDirectIdentifiers, isSensitiveCredentialField, redactCredentials } from "./redaction.ts";

const MAX_DEPTH = 32;
const MAX_NODES = 5_000;
const MAX_STRING_LENGTH = 100_000;
export type ProviderInputErrorCategory = "PRIVACY_BLOCKED" | "SANITIZATION_FAILED";

export class ProviderInputError extends Error {
  readonly category: ProviderInputErrorCategory;

  constructor(category: ProviderInputErrorCategory) {
    super(category === "PRIVACY_BLOCKED"
      ? "Provider input contains a likely direct identifier. Remove it or use synthetic/de-identified data."
      : "Provider input could not be sanitized safely; no provider request was sent.");
    this.category = category;
    this.name = "ProviderInputError";
  }
}

export type SanitizedProviderInput<T> = { value: T; credentialRedactions: number };

/** Recursively sanitizes JSON-compatible provider content and fails closed on unsupported structures. */
export function sanitizeProviderInput<T>(input: T): SanitizedProviderInput<T> {
  let nodes = 0;
  let credentialRedactions = 0;
  const ancestors = new WeakSet<object>();

  const visit = (value: unknown, depth: number, sensitiveField = false): unknown => {
    nodes++;
    if (nodes > MAX_NODES || depth > MAX_DEPTH) throw new ProviderInputError("SANITIZATION_FAILED");
    if (sensitiveField) {
      credentialRedactions++;
      return "[REDACTED]";
    }
    if (typeof value === "string") {
      if (value.length > MAX_STRING_LENGTH) throw new ProviderInputError("SANITIZATION_FAILED");
      const redacted = redactCredentials(value);
      credentialRedactions += redacted.redactionCount;
      if (detectDirectIdentifiers(redacted.text).length > 0) throw new ProviderInputError("PRIVACY_BLOCKED");
      return redacted.text;
    }
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (Array.isArray(value)) {
      if (ancestors.has(value)) throw new ProviderInputError("SANITIZATION_FAILED");
      ancestors.add(value);
      try {
        const descriptors = Object.getOwnPropertyDescriptors(value);
        if (Reflect.ownKeys(descriptors).some((key) => typeof key === "symbol")) throw new ProviderInputError("SANITIZATION_FAILED");
        const output = new Array(value.length);
        for (let index = 0; index < value.length; index++) {
          const descriptor = descriptors[String(index)];
          if (!descriptor) continue;
          if (!("value" in descriptor)) throw new ProviderInputError("SANITIZATION_FAILED");
          output[index] = visit(descriptor.value, depth + 1);
        }
        if (Object.keys(descriptors).some((key) => key !== "length" && !/^\d+$/.test(key))) {
          throw new ProviderInputError("SANITIZATION_FAILED");
        }
        return output;
      } finally {
        ancestors.delete(value);
      }
    }
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (ancestors.has(record)) throw new ProviderInputError("SANITIZATION_FAILED");
      const prototype = Object.getPrototypeOf(record);
      if (prototype !== Object.prototype && prototype !== null) throw new ProviderInputError("SANITIZATION_FAILED");
      ancestors.add(record);
      try {
        const descriptors = Object.getOwnPropertyDescriptors(record);
        if (Reflect.ownKeys(descriptors).some((key) => typeof key === "symbol")) throw new ProviderInputError("SANITIZATION_FAILED");
        const output: Record<string, unknown> = Object.create(prototype);
        for (const [key, descriptor] of Object.entries(descriptors)) {
          if (!descriptor.enumerable) continue;
          if (!("value" in descriptor)) throw new ProviderInputError("SANITIZATION_FAILED");
          if (key === "__proto__" || key === "constructor" || key === "prototype") throw new ProviderInputError("SANITIZATION_FAILED");
          const sanitizedKey = visit(key, depth + 1) as string;
          if (Object.hasOwn(output, sanitizedKey)) throw new ProviderInputError("SANITIZATION_FAILED");
          Object.defineProperty(output, sanitizedKey, {
            value: visit(descriptor.value, depth + 1, isSensitiveCredentialField(key)),
            enumerable: true,
            configurable: true,
            writable: true,
          });
        }
        return output;
      } finally {
        ancestors.delete(record);
      }
    }
    throw new ProviderInputError("SANITIZATION_FAILED");
  };

  try {
    return { value: visit(input, 0) as T, credentialRedactions };
  } catch (error) {
    if (error instanceof ProviderInputError) {
      console.info("Provider input privacy check stopped outbound content", { category: error.category });
      throw error;
    }
    console.info("Provider input privacy check stopped outbound content", { category: "SANITIZATION_FAILED" });
    throw new ProviderInputError("SANITIZATION_FAILED");
  }
}

/** Runs the outbound operation only after the complete nested payload sanitizes successfully. */
export async function withSanitizedProviderInput<TInput, TResult>(
  input: TInput,
  send: (safeInput: TInput) => Promise<TResult>,
): Promise<{ result: TResult; credentialRedactions: number }> {
  const sanitized = sanitizeProviderInput(input);
  if (sanitized.credentialRedactions > 0) {
    console.info("Provider input credentials redacted", { redactionCount: sanitized.credentialRedactions });
  }
  const result = await send(sanitized.value);
  return { result, credentialRedactions: sanitized.credentialRedactions };
}
