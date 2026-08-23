import { Tool } from "@/types/agent";

export type AgentDocument = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  mode: "MOCK" | "LIVE";
  version: string;
  capabilities: string[];
  tools: Tool[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type ToolDocument = {
  id: string;
  agentId: string;
  name: string;
  description: string;
  parameters: string[];
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

export type ScenarioDocument = {
  id: string;
  agentId: string;
  ownerId:string;
  title: string;
  category: string;
  severity: string;
  input: string;
  expected: string;
  failure: string;
  tools: string[];
  status: "PASSED" | "FAILED" | "PENDING";
  createdAt?: unknown;
};

export type EvaluationDocument = {
  id: string;
  agentId: string;
  ownerId: string;
  total: number;
  completed: number;
  passed: number;
  failed: number;
  status: "QUEUED"|"RUNNING" | "COMPLETED";
  createdAt?: unknown;
};

export type ExecutionTraceDocument = {
  id: string;
  evaluationId: string;
  agentId: string;
  ownerId:string;
  scenarioId: string;
  status: "PASSED" | "FAILED";
  events: {
    time: string;
    message: string;
  }[];
  createdAt?: unknown;
};

export type FailureDocument = {
  id: string;
  evaluationId: string;
  agentId: string;
  ownerId:string;
  scenarioId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: string;
  title: string;
  observedBehavior: string;
  expectedBehavior: string;
  risk: string;
  rootCause: string;
  recommendedFix: string;
  createdAt?: unknown;
};