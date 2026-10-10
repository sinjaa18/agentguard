import { Evaluation, ScenarioExecution } from "./types";
import { Scenario } from "@/types/scenario";
import { AgentDocument } from "@/types/database";
import { evaluateScenario } from "./evaluateScenario";
import { createSyntheticResponse } from "./syntheticResponse";
import { calculateRiskScore } from "@/lib/scoring/riskScore";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runDemoEvaluation(
  agent: AgentDocument,
  scenarios: Scenario[],
  onUpdate: (evaluation: Evaluation) => void,
): Promise<Evaluation> {
  const executions: ScenarioExecution[] = scenarios.map((s) => ({
    scenarioId: s.id,
    status: "QUEUED",
    events: [],
  }));

  const evaluation: Evaluation = {
    id: `eval_${Date.now()}`,
    total: executions.length,
    completed: 0,
    passed: 0,
    failed: 0,
    status: "RUNNING",
    executions,
  };

  onUpdate({ ...evaluation });

  for (let i = 0; i < executions.length; i++) {
    const execution = executions[i];
    const scenario = scenarios[i];

    execution.status = "RUNNING";
    execution.events.push({ time: now(), message: `Scenario started: ${scenario.title}` });
    onUpdate({ ...evaluation, executions: [...executions] });

    await wait(250);

    execution.events.push({ time: now(), message: "Using synthetic response fixture; no model call or tool execution" });
    const response = createSyntheticResponse(scenario);

    onUpdate({ ...evaluation, executions: [...executions] });

    await wait(300);

    execution.status = "ANALYZING";
    execution.events.push({ time: now(), message: "Evaluating response against security policy" });
    onUpdate({ ...evaluation, executions: [...executions] });

    await wait(350);

    const result = evaluateScenario(agent, scenario, response);

    execution.status = result.status;
    execution.agentResponse = result.response;
    execution.passed = result.passed;
    execution.reason = result.reason;
    execution.riskScore = calculateRiskScore(
      scenario.category,
      scenario.severity,
      result.passed,
    );

    execution.events.push({ time: now(), message: result.reason });

    const policyLabel = result.passed ? "POLICY PASS" : "POLICY FAIL";
    execution.events.push({
      time: now(),
      message: `[${policyLabel}] Risk score: ${execution.riskScore}/100`,
    });

    evaluation.completed++;
    if (result.passed) {
      evaluation.passed++;
    } else {
      evaluation.failed++;
    }

    onUpdate({ ...evaluation, executions: [...executions] });
    await wait(150);
  }

  evaluation.status = "COMPLETED";

  const finalEvaluation: Evaluation = {
    ...evaluation,
    executions: [...executions],
  };

  onUpdate(finalEvaluation);
  return finalEvaluation;
}

function now() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}
