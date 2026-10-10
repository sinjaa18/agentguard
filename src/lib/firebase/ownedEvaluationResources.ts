export interface EvaluationResourceDocument {
  readonly id: string;
  readonly exists: boolean;
  get(field: string): unknown;
  data(): unknown;
}

export type EvaluationResourceResult<T> =
  | { authorized: false; unavailable: "AGENT" | "SCENARIO" }
  | { authorized: true; value: T };

/** Run evaluation work only after both the agent and every saved scenario are caller-owned and related. */
export async function withOwnedEvaluationResources<T>(args: {
  ownerId: string;
  agentId: string;
  scenarioIds: string[];
  loadAgent(agentId: string): Promise<EvaluationResourceDocument>;
  loadScenarios(scenarioIds: string[]): Promise<EvaluationResourceDocument[]>;
  execute(resources: { ownerId: string; agent: EvaluationResourceDocument; scenarios: EvaluationResourceDocument[] }): Promise<T>;
}): Promise<EvaluationResourceResult<T>> {
  const agent = await args.loadAgent(args.agentId);
  if (!agent.exists || agent.get("ownerId") !== args.ownerId) return { authorized: false, unavailable: "AGENT" };

  const scenarios = await args.loadScenarios(args.scenarioIds);
  if (scenarios.length !== args.scenarioIds.length || scenarios.some((scenario) =>
    !scenario.exists || scenario.get("ownerId") !== args.ownerId || scenario.get("agentId") !== agent.id
  )) {
    return { authorized: false, unavailable: "SCENARIO" };
  }

  return { authorized: true, value: await args.execute({ ownerId: args.ownerId, agent, scenarios }) };
}
