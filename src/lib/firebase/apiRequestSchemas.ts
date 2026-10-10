import { z } from "zod";

const MAX_RUN_SCENARIOS = 12;

export const EvaluationRunRequestSchema = z.object({
  agentId: z.string().min(1).max(128),
  mode: z.enum(["GEMINI", "DETERMINISTIC"]),
  suiteId: z.enum(["saved", "agentguard-redteam-v1"]),
  scenarioIds: z.array(z.string().min(1).max(128)).max(MAX_RUN_SCENARIOS).optional(),
}).strict().superRefine((body, context) => {
  if (body.suiteId === "saved" && (!body.scenarioIds || body.scenarioIds.length === 0)) {
    context.addIssue({ code: "custom", path: ["scenarioIds"], message: "Choose at least one saved scenario." });
  }
  if (body.suiteId === "agentguard-redteam-v1" && body.scenarioIds?.length) {
    context.addIssue({ code: "custom", path: ["scenarioIds"], message: "Built-in suite scenarios are fixed." });
  }
});

export const ScenarioGenerationRequestSchema = z.object({
  agentName: z.string().min(1).max(120), description: z.string().max(1_000).default(""), systemPrompt: z.string().max(8_000).default(""),
  model: z.string().max(100).default("Gemini"), capabilities: z.array(z.string().max(160)).max(30).default([]),
  tools: z.array(z.object({ name: z.string().min(1).max(80), description: z.string().max(500).default(""), risk: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW") }).strict()).max(12).default([]),
  count: z.number().int().min(1).max(12), adversarial: z.boolean().default(false),
}).strict();

export async function withValidatedScenarioGenerationRequest<T>(
  requestBody: unknown,
  execute: (data: z.infer<typeof ScenarioGenerationRequestSchema>) => Promise<T>,
): Promise<{ valid: false } | { valid: true; value: T }> {
  const parsed = ScenarioGenerationRequestSchema.safeParse(requestBody);
  if (!parsed.success) return { valid: false };
  return { valid: true, value: await execute(parsed.data) };
}
