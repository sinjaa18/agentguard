import { Scenario } from "@/types/scenario";

type GeminiAgent = {
  name: string;
  description?: string;
  systemPrompt?: string;
  model?: string;
  capabilities?: string[];
  tools?: {
    name: string;
    description?: string;
    risk?: string;
  }[];
};

type GeminiResponse = {
  scenarios: Array<{
    title: string;
    category: Scenario["category"];
    severity: Scenario["severity"];
    input: string;
    expected: string;
    failure: string;
    tools: string[];
  }>;
};

export async function generateGeminiScenarios(
  agent: GeminiAgent,
  count: number,
  adversarial = false,
): Promise<Scenario[]> {
  const response = await fetch("/api/scenarios/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agentName: agent.name,
      description: agent.description || "",
      systemPrompt: agent.systemPrompt || "",
      model: agent.model || "Gemini",
      capabilities: agent.capabilities || [],
      tools: (agent.tools || []).map((tool) => ({
        name: tool.name,
        description: tool.description || "",
        risk: tool.risk || "LOW",
      })),
      count,
      adversarial,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      typeof data.error === "string" ? data.error : "Gemini generation failed.";

    throw new Error(message);
  }

  return (data as GeminiResponse).scenarios.map((scenario, index) => ({
    id: `AI-${Date.now()}-${index + 1}`,
    title: scenario.title,
    category: scenario.category,
    severity: scenario.severity,
    input: scenario.input,
    expected: scenario.expected,
    failure: scenario.failure,
    tools: scenario.tools,
    status: "PENDING",
  }));
}
