import type { Tool } from "@/types/agent";
import type { ScenarioCategory } from "@/types/scenario";
import type { RiskLevel } from "@/types/agent";

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
  category: ScenarioCategory;
  severity: RiskLevel;
  input: string;
  expected: string;
  failure: string;
  tools: string[];
  acceptanceCriteria?: string[];
  forbiddenBehaviors?: string[];
  forbiddenTools?: string[];
  expectedTools?: string[];
  referenceFacts?: string[];
  forbiddenClaims?: string[];
  toolOutputInjection?: string;
  maxToolCalls?: number;
  requireClarification?: boolean;
  suiteId?: string;
  suiteVersion?: number;
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
  unjudgeable?: number;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED" | "CANCELLED";
  mode?: "GEMINI" | "DETERMINISTIC";
  suiteId?: string;
  scenarioIds?: string[];
  suiteHash?: string;
  scenarioSnapshot?: Record<string, unknown>[];
  rubricVersion?: string;
  rubricHash?: string;
  agentModel?: string;
  judgeModel?: string;
  configSnapshot?: Record<string, unknown>;
  configHash?: string;
  errorCategory?: string | null;
  createdAt?: unknown;
};

export type ExecutionTraceDocument = {
  id: string;
  evaluationId: string;
  agentId: string;
  ownerId: string;
  scenarioId: string;
  status: "PASSED" | "FAILED" | "UNJUDGEABLE";
  events: {
    id?: string;
    sequence?: number;
    kind?: string;
    time: string;
    message: string;
  }[];
  // enriched fields
  userInput?: string;
  agentResponse?: string;
  toolUsed?: string | null;
  toolResult?: string | null;
  passed?: boolean;
  reason?: string;
  riskScore?: number;
  scenarioCategory?: string;
  scenarioSeverity?: string;
  scenarioExpected?: string;
  outcome?: "PASS" | "FAIL" | "PARTIAL" | "UNJUDGEABLE";
  evidence?: { id: string; source: string; text: string }[];
  judge?: Record<string, unknown>;
  judgeMetadata?: Record<string, unknown>;
  policyFindings?: Record<string, unknown>[];
  groundingFindings?: Record<string, unknown>[];
  toolObservations?: Record<string, unknown>[];
  telemetry?: Record<string, unknown>;
  errorCategory?: string | null;
  createdAt?: unknown;
};

export type FailureDocument = {
  id: string;
  evaluationId: string;
  agentId: string;
  ownerId:string;
  scenarioId: string;
  severity: RiskLevel;
  category: string;
  title: string;
  observedBehavior: string;
  expectedBehavior: string;
  risk: string;
  rootCause: string;
  recommendedFix: string;
  createdAt?: unknown;
};
