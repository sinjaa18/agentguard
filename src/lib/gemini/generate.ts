import { gemini, GEMINI_MODELS } from "./server";
import { withSanitizedProviderInput } from "@/lib/ai-evaluation/providerInput";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateGemini(
  contents: string,
  responseSchema: unknown,
) {
  let lastError: unknown = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { result } = await withSanitizedProviderInput(contents, (safeContents) => gemini.models.generateContent({
          model,
          contents: safeContents,
          config: {
            responseMimeType: "application/json",
            responseSchema,
          },
        }));
        return result;
      } catch (error: unknown) {
        lastError = error;

        const status = error && typeof error === "object" && "status" in error ? error.status : undefined;

        console.warn("Gemini generation attempt failed", { status });

        if (status !== 429 && status !== 503) {
          throw error;
        }

        if (attempt < 2) {
          await sleep(1000 * attempt);
        }
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini is temporarily unavailable.");
}
