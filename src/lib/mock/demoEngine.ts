import { demoScenarios } from "@/data/demoScenarios";
import { Scenario } from "@/types/scenario";

export function getDemoScenarios(): Scenario[] {
  return demoScenarios.map((s) => ({ ...s }));
}

export function runScenario(scenario: Scenario): Scenario {
  return {
    ...scenario,
    status:
      scenario.id === "SCN-001" || scenario.id === "SCN-002"
        ? "PASSED"
        : "FAILED",
  };
}
