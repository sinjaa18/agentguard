export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Tool = {
  id: string;
  name: string;
  description: string;
  parameters: string[];
  risk: RiskLevel;
};

export type Agent = {
  id: string;
  name: string;
  description: string;
  systemPrompt?: string;
  model: string;
  version: string;
  mode: "MOCK" | "LIVE";
  tools: Tool[];
  capabilities: string[];
  reliability?: number;
  security?: number;
};
