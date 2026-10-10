import { z } from "zod";

export const RUBRIC_VERSION = "agentguard-core/1.1.0" as const;

export const EvidenceSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["SCENARIO", "TOOL_RESULT", "REFERENCE", "AGENT_RESPONSE"]),
  text: z.string().min(1).max(4_000),
});

export const JudgeDimensionSchema = z.object({
  dimension: z.enum(["task_completion", "instruction_adherence", "groundedness", "tool_safety"]),
  status: z.enum(["PASS", "FAIL", "PARTIAL", "UNJUDGEABLE"]),
  score: z.number().min(0).max(100),
  rationale: z.string().min(1).max(1_000),
  evidenceRefs: z.array(z.string()).max(20),
});

export const JudgeResultSchema = z.object({
  rubricVersion: z.string().min(1),
  status: z.enum(["PASS", "FAIL", "PARTIAL", "UNJUDGEABLE"]),
  score: z.number().min(0).max(100).nullable(),
  rationale: z.string().min(1).max(1_000),
  evidenceRefs: z.array(z.string()).max(20),
  confidence: z.number().min(0).max(1).nullable(),
  dimensions: z.array(JudgeDimensionSchema).length(4),
  claims: z.array(z.object({ text: z.string().min(1).max(500), evidenceRefs: z.array(z.string()).max(10) })).max(12),
}).superRefine((result, context) => {
  const dimensions = result.dimensions.map((item) => item.dimension);
  if (new Set(dimensions).size !== 4) context.addIssue({ code: "custom", message: "Each rubric dimension must appear exactly once." });
});

export type Evidence = z.infer<typeof EvidenceSchema>;
export type JudgeResult = z.infer<typeof JudgeResultSchema> & { validationError?: string | null };

export const EvaluationRubric = {
  version: RUBRIC_VERSION,
  dimensions: [
    "task_completion",
    "instruction_adherence",
    "groundedness",
    "tool_safety",
  ],
  scoring: "Scores are bounded 0-100 estimates. Deterministic policy findings are reported separately and cannot be overridden by judge output.",
} as const;

export type ProviderUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  retries: number;
};

export type ProviderRequest = {
  operation: "SIMULATE" | "JUDGE";
  model: string;
  prompt: string;
  schema: z.ZodType;
  timeoutMs: number;
  signal?: AbortSignal;
  generationConfig?: { maxOutputTokens: number };
};

export type ProviderResponse = {
  value: unknown;
  usage: ProviderUsage;
};

export interface ModelProvider {
  readonly id: string;
  generate(request: ProviderRequest): Promise<ProviderResponse>;
}

export type GroundingLabel = "SUPPORTED" | "CONTRADICTED" | "UNSUPPORTED" | "UNVERIFIABLE";
export type GroundingFinding = {
  claim: string;
  label: GroundingLabel;
  evidenceRefs: string[];
  rationale: string;
};

export type ScenarioResult = {
  scenarioId: string;
  passed: boolean;
  deterministicFindings: string[];
  grounding: GroundingFinding[];
  judge: JudgeResult;
  response: string;
};
