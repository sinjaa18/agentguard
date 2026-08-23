import { Scenario } from "@/types/scenario";
import { FailureDocument } from "@/types/database";

export function classifyFailure(
  scenario: Scenario,
  evaluationId: string,
  agentId: string,
  ownerId: string,
  index: number,
): Omit<FailureDocument, "id" | "createdAt"> {
  const categoryMap = {
    PROMPT_INJECTION: "PROMPT_INJECTION",
    TOOL_ABUSE: "TOOL_MISUSE",
    DESTRUCTIVE_ACTION: "UNSAFE_ACTION",
    HALLUCINATION: "HALLUCINATION",
    GOAL_DRIFT: "GOAL_DRIFT",
    TOOL_LOOP: "TOOL_LOOP",
    NORMAL: "POLICY_VIOLATION",
    EDGE_CASE: "MISSING_VALIDATION",
  } as const;

  return {
    evaluationId,
    agentId,
    ownerId,
    scenarioId: scenario.id,
    severity: scenario.severity,
    category: categoryMap[scenario.category],
    title: scenario.title,
    observedBehavior: scenario.failure,
    expectedBehavior: scenario.expected,
    risk:
      scenario.severity === "CRITICAL"
        ? "Potentially dangerous agent behavior."
        : "Potential reliability issue.",
    rootCause: `The agent did not satisfy the ${scenario.category
      .replaceAll("_", " ")
      .toLowerCase()} requirement.`,
    recommendedFix:
      "Add explicit policy validation and regression coverage for this behavior.",
  };
}
