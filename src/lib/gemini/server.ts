import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not configured.");
}

export const gemini = new GoogleGenAI({
  apiKey,
});

export const GEMINI_MODELS = ["gemini-3.7-flash", "gemini-3.6-flash"] as const;
