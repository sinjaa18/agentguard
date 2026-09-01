export type EvaluationStatus = "QUEUED" | "RUNNING" | "COMPLETED";

export type ScenarioExecutionStatus =
  | "QUEUED"
  | "RUNNING"
  | "TOOL_CALL"
  | "ANALYZING"
  | "PASSED"
  | "FAILED";

export type ExecutionEvent = {
  time: string;
  message: string;
};

export type ScenarioExecution = {
  scenarioId: string;
  status: ScenarioExecutionStatus;
  events: ExecutionEvent[];
  // enriched fields captured during execution
  agentResponse?: string;
  toolUsed?: string;
  toolResult?: string | null;
  passed?: boolean;
  reason?: string;
  riskScore?: number;
};

export type Evaluation = {
  id: string;
  total: number;
  completed: number;
  passed: number;
  failed: number;
  status: EvaluationStatus;
  executions: ScenarioExecution[];
};
