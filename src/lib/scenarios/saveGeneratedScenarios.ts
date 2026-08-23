import { Scenario } from "@/types/scenario";
import { createScenarioDocuments } from "@/lib/firebase/scenarios";

export async function saveGeneratedScenarios(
  agentId: string,
  ownerId: string,
  scenarios: Scenario[],
) {
  return createScenarioDocuments(
    agentId,
    ownerId,
    scenarios.map((s) => ({
      title: s.title,
      category: s.category,
      severity: s.severity,
      input: s.input,
      expected: s.expected,
      failure: s.failure,
      tools: s.tools,
      status: s.status,
    })),
  );
}
