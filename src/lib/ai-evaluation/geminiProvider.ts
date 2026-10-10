import "server-only";
import { z } from "zod";
import { gemini } from "@/lib/gemini/server";
import { ProviderInputError, withSanitizedProviderInput } from "./providerInput.ts";
import type { ModelProvider, ProviderRequest, ProviderResponse } from "./contracts.ts";

export type ProviderErrorCategory = "RATE_LIMIT" | "TIMEOUT" | "CANCELLED" | "AUTHENTICATION" | "INVALID_REQUEST" | "MALFORMED_OUTPUT" | "UNAVAILABLE" | "UNKNOWN";

export class ProviderError extends Error {
  constructor(readonly category: ProviderErrorCategory) {
    super(`Gemini provider request failed (${category}).`);
    this.name = "ProviderError";
  }
}

function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.anyOf) && record.anyOf.some((part) => (part as Record<string, unknown>)?.type === "null")) {
      const nonNull = record.anyOf.find((part) => (part as Record<string, unknown>)?.type !== "null") as Record<string, unknown>;
      return { ...visit(nonNull) as Record<string, unknown>, nullable: true };
    }
    return Object.fromEntries(Object.entries(record)
      .filter(([key]) => key !== "$schema" && key !== "additionalProperties")
      .map(([key, item]) => [key, visit(item)]));
  };
  return visit(z.toJSONSchema(schema)) as Record<string, unknown>;
}

/** Single-attempt Gemini adapter. Token and latency fields stay null if unavailable. */
export const geminiProvider: ModelProvider = {
  id: "google-gemini",
  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    if (request.prompt.length > 20_000) throw new ProviderError("INVALID_REQUEST");
    const started = performance.now();
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    request.signal?.addEventListener("abort", onAbort, { once: true });
    if (request.signal?.aborted) controller.abort();
    const timer = setTimeout(() => controller.abort(), Math.max(1, Math.min(request.timeoutMs, 120_000)));
    try {
      const { result: response } = await withSanitizedProviderInput({ model: request.model, prompt: request.prompt }, (safeRequest) => gemini.models.generateContent({
        model: safeRequest.model,
        contents: safeRequest.prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: toGeminiSchema(request.schema),
          abortSignal: controller.signal,
          maxOutputTokens: request.generationConfig?.maxOutputTokens ?? 1_200,
        },
      }));
      if (!response.text || response.text.length > 24_000) throw new ProviderError("MALFORMED_OUTPUT");
      const value = JSON.parse(response.text) as unknown;
      return {
        value,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? null,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
          latencyMs: Math.round(performance.now() - started),
          retries: 0,
        },
      };
    } catch (error) {
      if (error instanceof ProviderInputError) throw error;
      if (error instanceof ProviderError) throw error;
      if (controller.signal.aborted) throw new ProviderError(request.signal?.aborted ? "CANCELLED" : "TIMEOUT");
      const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : undefined;
      const category: ProviderErrorCategory = status === 408 || status === 504 ? "TIMEOUT"
        : status === 429 ? "RATE_LIMIT"
        : status === 401 || status === 403 ? "AUTHENTICATION"
        : status === 400 ? "INVALID_REQUEST"
        : status === 503 || status === 502 ? "UNAVAILABLE"
        : error instanceof SyntaxError ? "MALFORMED_OUTPUT"
        : "UNKNOWN";
      throw new ProviderError(category);
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", onAbort);
    }
  },
};
