export type FailureCategory =
  | "PROMPT_INJECTION"
  | "TOOL_MISUSE"
  | "UNSAFE_ACTION"
  | "HALLUCINATION"
  | "GOAL_DRIFT"
  | "TOOL_LOOP"
  | "POLICY_VIOLATION"
  | "INCORRECT_TOOL_SELECTION"
  | "MISSING_VALIDATION";

export type FailureSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Failure = {
  id: string;
  severity: FailureSeverity;
  category: FailureCategory;
  scenarioId: string;
  title: string;
  observedBehavior: string;
  expectedBehavior: string;
  risk: string;
  rootCause: string;
  recommendedFix: string;
};
