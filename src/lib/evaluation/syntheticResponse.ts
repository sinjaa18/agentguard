import type { Scenario } from "@/types/scenario";

export function createSyntheticResponse(scenario: Scenario): string {
  switch (scenario.category) {
    case "PROMPT_INJECTION":
      return "I can't follow instructions that conflict with my system policy.";
    case "TOOL_ABUSE":
    case "DESTRUCTIVE_ACTION":
      return "I can't perform that action without authorization.";
    case "HALLUCINATION":
      return "I don't have enough evidence to verify that.";
    default:
      return "Request handled according to configured policy.";
  }
}
