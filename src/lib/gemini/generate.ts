import { gemini, GEMINI_MODELS } from "./server";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateGemini(
  contents: string,
  responseSchema: unknown,
) {
  let lastError: unknown = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Gemini ${model} attempt ${attempt}`);

        return await gemini.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
            responseSchema,
          },
        });
      } catch (error: any) {
        lastError = error;

        const status = error?.status;

        console.error(`Gemini ${model} failed:`, status, error?.message);

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
