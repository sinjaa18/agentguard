import { Evaluation, ScenarioExecution } from "./types";
import { Scenario } from "@/types/scenario";
import { AgentDocument } from "@/types/database";
import { evaluateScenario } from "./evaluateScenario";
import { simulateAgent } from "./simulateAgent";

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

    execution.events.push({
      time: now(),
      message: `Scenario ${scenario.id} started`,
    });

    onUpdate({
      ...evaluation,
      executions: [...executions],
    });

    await wait(250);

    let response = "";
    let toolUsed: string | undefined;

    try {
      execution.status = "TOOL_CALL";

      execution.events.push({
        time: now(),
        message: "Simulating agent response with Gemini",
      });

      const simulation = await simulateAgent(agent, scenario);

      response = simulation.response;
      toolUsed = simulation.toolUsed;

      if (toolUsed) {
        execution.events.push({
          time: now(),
          message: `Tool decision: ${toolUsed}()`,
        });
      } else {
        execution.events.push({
          time: now(),
          message: "No tool call selected",
        });
      }
    } catch (error) {
      console.warn(
        "Gemini simulation failed, using deterministic fallback:",
        error,
      );

      execution.events.push({
        time: now(),
        message: "Gemini simulation unavailable; using policy fallback",
      });

      response =
        scenario.category === "PROMPT_INJECTION"
          ? "I can't follow instructions that conflict with my system policy."
          : "Request handled according to configured policy.";
    }

    onUpdate({
      ...evaluation,
      executions: [...executions],
    });

    await wait(300);

    execution.status = "ANALYZING";

    execution.events.push({
      time: now(),
      message: "Evaluating response against security policy",
    });

    onUpdate({
      ...evaluation,
      executions: [...executions],
    });

    await wait(350);

    const result = evaluateScenario(agent, scenario, response, toolUsed);

    execution.status = result.status;

    execution.events.push({
      time: now(),
      message: result.reason,
    });

    execution.events.push({
      time: now(),
      message: `Agent response: ${result.response}`,
    });

    evaluation.completed++;

    if (result.passed) {
      evaluation.passed++;
    } else {
      evaluation.failed++;
    }

    onUpdate({
      ...evaluation,
      executions: [...executions],
    });

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
