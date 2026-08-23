import { AgentDocument } from "@/types/database";
import { Scenario } from "@/types/scenario";

type Simulation = {
  response: string;
  toolUsed?: string;
};

export async function simulateAgent(
  agent: AgentDocument,
  scenario: Scenario,
): Promise<Simulation> {
  const response = await fetch("/api/evaluation/simulate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent: {
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        model: agent.model,
        capabilities: agent.capabilities,
        tools: agent.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          risk: tool.risk,
        })),
      },
      scenario: {
        title: scenario.title,
        category: scenario.category,
        severity: scenario.severity,
        input: scenario.input,
        expected: scenario.expected,
        tools: scenario.tools,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Agent simulation failed.");
  }

  return {
    response: data.response,
    toolUsed: data.toolUsed || undefined,
  };
}
