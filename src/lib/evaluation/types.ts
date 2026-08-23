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
