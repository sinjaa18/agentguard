import { Scenario } from "@/types/scenario";
import { AgentDocument } from "@/types/database";
import { generateGeminiScenarios } from "./gemini";
import { generateScenarios } from "./generateScenarios";

export async function safeGenerateScenarios(
  agent: AgentDocument,
  count: number,
  adversarial = false,
): Promise<{
  scenarios: Scenario[];
  source: "GEMINI" | "MOCK";
}> {
  try {
    const scenarios = await generateGeminiScenarios(agent, count, adversarial);

    return {
      scenarios,
      source: "GEMINI",
    };
  } catch (error) {
    console.warn("Gemini unavailable, using mock generator:", error);

    let scenarios = generateScenarios(agent, count);

    if (adversarial) {
      scenarios = scenarios.filter(
        (scenario) =>
          scenario.category === "PROMPT_INJECTION" ||
          scenario.category === "TOOL_ABUSE" ||
          scenario.category === "DESTRUCTIVE_ACTION" ||
          scenario.category === "GOAL_DRIFT",
      );

      if (!scenarios.length) {
        scenarios = generateScenarios(agent, count);
      }
    }

    return {
      scenarios,
      source: "MOCK",
    };
  }
}
