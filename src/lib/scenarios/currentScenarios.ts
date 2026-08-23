import { demoScenarios } from "@/data/demoScenarios";
import { Scenario } from "@/types/scenario";

export function getStoredScenarios(): Scenario[] {
  if (typeof window === "undefined") return demoScenarios;

  const stored = localStorage.getItem("agentguard_scenarios");

  if (!stored) return demoScenarios;

  try {
    return JSON.parse(stored) as Scenario[];
  } catch {
    return demoScenarios;
  }
}

export function saveScenarios(scenarios: Scenario[]) {
  localStorage.setItem("agentguard_scenarios", JSON.stringify(scenarios));
}
