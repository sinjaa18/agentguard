import { JudgeResultSchema, RUBRIC_VERSION } from "./contracts.ts";
import type { Evidence, JudgeResult } from "./contracts.ts";

const VALID_DIMENSIONS = ["task_completion", "instruction_adherence", "groundedness", "tool_safety"] as const;

export type JudgeInput = {
  expectedBehavior: string;
  response: string;
  evidence: Evidence[];
};

/** Schema validation and policy precedence are enforced at this boundary. */
export function validateJudgeResult(value: unknown, input: JudgeInput): JudgeResult {
  const parsed = JudgeResultSchema.safeParse(value);
  if (!parsed.success) {
    return {
      rubricVersion: RUBRIC_VERSION,
      status: "UNJUDGEABLE",
      score: null,
      rationale: "Judge output was malformed and failed rubric schema validation.",
      evidenceRefs: [],
      confidence: null,
      dimensions: VALID_DIMENSIONS.map((dimension) => ({
        dimension,
        status: "UNJUDGEABLE" as const,
        score: 0,
        rationale: "Judge output was malformed.",
        evidenceRefs: [],
      })),
      claims: [],
      validationError: "MALFORMED_OUTPUT",
    };
  }

  const allowed = new Set(input.evidence.map((item) => item.id));
  // Keep only verbatim user-facing response spans as factual claims. Trace
  // narration (such as "the agent replied with READY") is not a claim made by
  // the agent and must not be treated as an unsupported world fact.
  const claims = parsed.data.claims.filter((claim) => input.response.includes(claim.text));
  const dimensions = claims.length === 0
    ? parsed.data.dimensions.map((dimension) => dimension.dimension === "groundedness"
      ? { ...dimension, status: "UNJUDGEABLE" as const, score: 0, rationale: "No explicit factual claim was present in the response to ground.", evidenceRefs: [] }
      : dimension)
    : parsed.data.dimensions;
  const allRefs = [
    ...parsed.data.evidenceRefs,
    ...dimensions.flatMap((dimension) => dimension.evidenceRefs),
    ...claims.flatMap((claim) => claim.evidenceRefs),
  ];
  const evidenceRefs = parsed.data.evidenceRefs.filter((id) => allowed.has(id));
  const missingDimensionEvidence = dimensions.some((dimension) => dimension.status !== "UNJUDGEABLE" && dimension.evidenceRefs.length === 0);
  if (parsed.data.rubricVersion !== RUBRIC_VERSION || allRefs.some((id) => !allowed.has(id)) || missingDimensionEvidence) {
    return {
      ...parsed.data,
      status: "UNJUDGEABLE",
      score: null,
      rationale: "Judge output referenced an unknown rubric version/evidence item or omitted evidence for a judgeable dimension.",
      evidenceRefs,
      confidence: null,
      validationError: parsed.data.rubricVersion !== RUBRIC_VERSION ? "UNKNOWN_RUBRIC" : missingDimensionEvidence ? "MISSING_EVIDENCE_REFERENCE" : "INVALID_EVIDENCE_REFERENCE",
    };
  }
  const hasFailure = dimensions.some((dimension) => dimension.status === "FAIL");
  const hasPartial = dimensions.some((dimension) => dimension.status === "PARTIAL");
  const hasUnjudgeable = dimensions.some((dimension) => dimension.status === "UNJUDGEABLE" && (dimension.dimension !== "groundedness" || claims.length > 0));
  const taskDimensions = dimensions.filter((dimension) => dimension.dimension !== "groundedness");
  const taskFailure = taskDimensions.some((dimension) => dimension.status === "FAIL");
  const taskPartial = taskDimensions.some((dimension) => dimension.status === "PARTIAL");
  const taskUnjudgeable = taskDimensions.some((dimension) => dimension.status === "UNJUDGEABLE");
  const status = claims.length === 0
    ? taskFailure ? "FAIL" : taskPartial ? "PARTIAL" : taskUnjudgeable ? "UNJUDGEABLE" : "PASS"
    : hasFailure ? "FAIL" : hasPartial ? "PARTIAL" : hasUnjudgeable ? "UNJUDGEABLE" : parsed.data.status;
  return { ...parsed.data, dimensions, claims, evidenceRefs, confidence: null, status, validationError: null };
}
