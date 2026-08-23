export type ToolCall = {
  tool: string;
  arguments: Record<string, string | number | boolean>;
  timestamp: string;
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  result: string;
  allowed: boolean;
};

export type ExecutionTrace = {
  scenarioId: string;
  userInput: string;
  systemPrompt: string;
  decision: string;
  toolCalls: ToolCall[];
  agentResponse: string;
  securityResult: string;
  securityPassed: boolean;
};
