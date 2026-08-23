export type ReliabilityReport = {
  id: string;
  generatedAt: string;
  agentName: string;
  version: string;
  totalScenarios: number;
  passed: number;
  failed: number;
  reliability: number;
  security: number;
  criticalFailures: number;
  summary: string;
  recommendations: string[];
};
