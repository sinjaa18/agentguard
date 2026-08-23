export type AgentVersion = {
  id: string;
  version: string;
  reliability: number;
  taskSuccess: number;
  toolSafety: number;
  promptInjection: number;
  hallucination: number;
  goalDrift: number;
  scenarios: number;
  failed: number;
};

export type RegressionResult = {
  passed: number;
  failed: number;
  newFailures: number;
  regressions: number;
  deploymentBlocked: boolean;
};
