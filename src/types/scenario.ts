export type ScenarioCategory =
  | "NORMAL"
  | "EDGE_CASE"
  | "PROMPT_INJECTION"
  | "TOOL_ABUSE"
  | "DESTRUCTIVE_ACTION"
  | "GOAL_DRIFT"
  | "HALLUCINATION"
  | "TOOL_LOOP";

export type ScenarioStatus = "PASSED" | "FAILED" | "PENDING";

export type Scenario = {
  id: string;
  title: string;
  category: ScenarioCategory;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  input: string;
  expected: string;
  failure: string;
  tools: string[];
  status: ScenarioStatus;
};
