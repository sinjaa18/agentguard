"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AgentSelector from "@/components/agents/AgentSelector";
import { getAgentScenarios } from "@/lib/firebase/scenarios";
import { runDemoEvaluation } from "@/lib/evaluation/mockEngine";
import { Evaluation } from "@/lib/evaluation/types";
import { Scenario } from "@/types/scenario";
import { AgentDocument, EvaluationDocument } from "@/types/database";
import { auth } from "@/lib/firebase/client";
import {
  createEvaluation,
  createExecutionTrace,
  createFailure,
  getAgentEvaluations,
} from "@/lib/firebase/evaluations";
import { classifyFailure } from "@/lib/evaluation/classifyFailure";

function EvaluationsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [running, setRunning] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [agent, setAgent] = useState<AgentDocument | null>(null);
  const [agentId, setAgentId] = useState(searchParams.get("agentId") ?? "");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<EvaluationDocument[]>([]);

  // Load scenarios + history whenever agent changes
  useEffect(() => {
    if (!agentId) {
      setScenarios([]);
      setHistory([]);
      setEvaluation(null);
      return;
    }

    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setScenarios([]);
        setHistory([]);
        setEvaluation(null);
        return;
      }

      setLoading(true);
      setEvaluation(null);

      try {
        const [scenarioData, evaluationData] = await Promise.all([
          getAgentScenarios(agentId, user.uid),
          getAgentEvaluations(agentId, user.uid),
        ]);

        setScenarios(
          scenarioData.map((s) => ({
            id: s.id,
            title: s.title,
            category: s.category as Scenario["category"],
            severity: s.severity as Scenario["severity"],
            input: s.input,
            expected: s.expected,
            failure: s.failure,
            tools: s.tools || [],
            status: s.status,
          })),
        );

        setHistory(evaluationData);
      } catch (error) {
        console.error("Failed to load evaluation data:", error);
        setScenarios([]);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [agentId]);

  const handleAgentChange = useCallback((selected: AgentDocument) => {
    setAgent(selected);
    setAgentId(selected.id);
    setEvaluation(null);
  }, []);

  const start = async () => {
    if (!agent || !scenarios.length || running) return;

    const user = auth.currentUser;

    if (!user) {
      alert("Please sign in first.");
      return;
    }

    setRunning(true);
    setEvaluation(null);

    try {
      const finalEvaluation = await runDemoEvaluation(
        agent,
        scenarios,
        setEvaluation,
      );

      const evaluationId = await createEvaluation({
        agentId: agent.id,
        ownerId: user.uid,
        total: finalEvaluation.total,
        completed: finalEvaluation.completed,
        passed: finalEvaluation.passed,
        failed: finalEvaluation.failed,
        status: finalEvaluation.status,
      });

      for (let i = 0; i < finalEvaluation.executions.length; i++) {
        const execution = finalEvaluation.executions[i];
        const scenario = scenarios[i];

        await createExecutionTrace({
          evaluationId,
          agentId: agent.id,
          ownerId: user.uid,
          scenarioId: scenario.id,
          status: execution.status === "FAILED" ? "FAILED" : "PASSED",
          events: execution.events,
          userInput: scenario.input,
          agentResponse: execution.agentResponse ?? "",
          toolUsed: execution.toolUsed ?? null,
          toolResult: execution.toolResult ?? null,
          passed: execution.status !== "FAILED",
          reason: execution.reason ?? "",
          riskScore: execution.riskScore ?? 0,
          scenarioCategory: scenario.category,
          scenarioSeverity: scenario.severity,
        });

        if (execution.status === "FAILED") {
          await createFailure(
            classifyFailure(scenario, evaluationId, agent.id, user.uid, i),
          );
        }
      }

      const updatedHistory = await getAgentEvaluations(agent.id, user.uid);
      setHistory(updatedHistory);

      console.log("Evaluation saved:", evaluationId);
    } catch (error) {
      console.error("Evaluation failed:", error);
      alert(error instanceof Error ? error.message : "Evaluation failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[var(--bg-base)] text-white ml-60 p-8">
        <div className="mx-auto max-w-6xl">
          <div>
            <p className="text-xs text-[var(--text-muted)]">EVALUATIONS</p>
            <h1 className="mt-2 text-3xl font-semibold">Run Evaluation</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Select an agent and run its evaluation suite.
            </p>
          </div>

          <div className="mt-6 max-w-md">
            <p className="mb-2 text-xs text-[var(--text-muted)]">SELECT AGENT</p>
            <AgentSelector
              value={agentId}
              onChange={handleAgentChange}
              preselect={agentId}
            />
          </div>

          {!agent && (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Select an agent to start an evaluation.
              </p>
              <Link
                href="/agents/new"
                className="mt-4 inline-block rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black"
              >
                Create Agent
              </Link>
            </div>
          )}

          {agent && (
            <>
              <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <Info label="Agent" value={agent.name} />
                  <Info label="Model" value={agent.model} />
                  <Info label="Tools" value={String(agent.tools?.length || 0)} />
                  <Info label="Scenarios" value={String(scenarios.length)} />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  {loading
                    ? "Loading scenarios..."
                    : scenarios.length === 0
                      ? "No scenarios — generate them first."
                      : `${scenarios.length} scenarios ready.`}
                </p>

                {scenarios.length === 0 && !loading && (
                  <Link
                    href="/scenarios"
                    className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900"
                  >
                    Generate Scenarios
                  </Link>
                )}

                <button
                  onClick={start}
                  disabled={running || loading || scenarios.length === 0}
                  className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black disabled:opacity-50"
                >
                  {running
                    ? "Evaluation Running..."
                    : loading
                      ? "Loading..."
                      : scenarios.length === 0
                        ? "No Scenarios"
                        : "Run Evaluation"}
                </button>
              </div>

              {evaluation && (
                <>
                  <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Stat label="Progress" value={`${evaluation.completed}/${evaluation.total}`} />
                    <Stat label="Passed" value={evaluation.passed} />
                    <Stat label="Failed" value={evaluation.failed} />
                    <Stat label="Status" value={evaluation.status} />
                  </div>

                  <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
                    <div className="border-b border-[var(--border)] p-5">
                      <h2 className="font-medium">Execution</h2>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Live scenario execution</p>
                    </div>

                    <div className="divide-y divide-zinc-900">
                      {evaluation.executions.map((execution, idx) => {
                        const scenario = scenarios[idx];
                        return (
                          <div key={execution.scenarioId} className="p-5">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-mono text-sm text-zinc-300">
                                  {scenario?.title ?? execution.scenarioId}
                                </span>
                                <span className="ml-3 font-mono text-xs text-[var(--text-dim)]">
                                  {execution.scenarioId}
                                </span>
                              </div>
                              <Status status={execution.status} />
                            </div>

                            {scenario && (
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <div className="rounded-lg border border-[var(--border)] bg-zinc-950 p-3">
                                  <p className="text-xs text-[var(--text-muted)] mb-1">User Input</p>
                                  <p className="text-xs text-zinc-300">{scenario.input}</p>
                                </div>
                                <div className="rounded-lg border border-[var(--border)] bg-zinc-950 p-3">
                                  <p className="text-xs text-[var(--text-muted)] mb-1">Category / Severity</p>
                                  <p className="text-xs">
                                    <span className="text-[var(--text-secondary)]">{scenario.category.replaceAll("_", " ")}</span>
                                    <span className="mx-2 text-zinc-700">·</span>
                                    <span className={
                                      scenario.severity === "CRITICAL" ? "text-red-400" :
                                      scenario.severity === "HIGH" ? "text-orange-400" :
                                      "text-[var(--text-secondary)]"
                                    }>{scenario.severity}</span>
                                  </p>
                                </div>
                              </div>
                            )}

                            {execution.toolUsed && (
                              <div className="mt-2 rounded-lg border border-[var(--border)] bg-zinc-950 p-3">
                                <p className="text-xs text-[var(--text-muted)] mb-1">Tool Called</p>
                                <p className="font-mono text-xs text-emerald-400">{execution.toolUsed}()</p>
                                {execution.toolResult && (
                                  <pre className="mt-1 text-xs text-[var(--text-secondary)] overflow-x-auto">{
                                    typeof execution.toolResult === "string"
                                      ? execution.toolResult
                                      : JSON.stringify(execution.toolResult, null, 2)
                                  }</pre>
                                )}
                              </div>
                            )}

                            {execution.agentResponse && (
                              <div className="mt-2 rounded-lg border border-[var(--border)] bg-zinc-950 p-3">
                                <p className="text-xs text-[var(--text-muted)] mb-1">Agent Response</p>
                                <p className="text-xs text-zinc-300">{execution.agentResponse}</p>
                              </div>
                            )}

                            {execution.reason && (
                              <div className="mt-2 flex items-start gap-2">
                                <span className={`text-xs font-medium ${execution.status === "PASSED" ? "text-emerald-400" : "text-red-400"}`}>
                                  {execution.status === "PASSED" ? "✓" : "✗"}
                                </span>
                                <p className="text-xs text-[var(--text-secondary)]">{execution.reason}</p>
                              </div>
                            )}

                            <div className="mt-3 rounded-lg bg-black p-3 font-mono text-xs text-[var(--text-muted)]">
                              {execution.events.map((event, index) => (
                                <div key={index}>
                                  <span className="text-zinc-700">[{event.time}]</span>{" "}{event.message}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {evaluation.status === "COMPLETED" && (
                      <div className="flex justify-end gap-3 border-t border-[var(--border)] p-5">
                        <Link
                          href="/failures"
                          className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300"
                        >
                          View Failures
                        </Link>
                        <Link
                          href="/reports"
                          className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black"
                        >
                          Generate Report
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          <div className="mt-8 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
            <div className="border-b border-[var(--border)] p-5">
              <h2 className="font-medium">Evaluation History</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Previous evaluation runs for this agent</p>
            </div>

            {!agent ? (
              <div className="p-8 text-center text-sm text-[var(--text-dim)]">
                Select an agent to view evaluation history.
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--text-dim)]">
                No previous evaluations.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                  <tr>
                    <th className="p-4 text-left">Evaluation ID</th>
                    <th className="p-4 text-left">Progress</th>
                    <th className="p-4 text-left">Passed</th>
                    <th className="p-4 text-left">Failed</th>
                    <th className="p-4 text-left">Reliability</th>
                    <th className="p-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/evaluations/${item.id}`)}
                      className="cursor-pointer border-t border-zinc-900 hover:bg-zinc-900/40"
                    >
                      <td className="p-4 font-mono text-xs text-[var(--text-secondary)]">{item.id}</td>
                      <td className="p-4">{item.completed}/{item.total}</td>
                      <td className="p-4 text-emerald-400">{item.passed}</td>
                      <td className="p-4 text-red-400">{item.failed}</td>
                      <td className="p-4 text-zinc-300">
                        {item.total ? `${Math.round((item.passed / item.total) * 100)}%` : "—"}
                      </td>
                      <td className="p-4"><Status status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}

export default function EvaluationsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[var(--bg-base)] text-white ml-60 p-8 flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      </main>
    }>
      <EvaluationsInner />
    </Suspense>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 truncate text-sm">{value}</p>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const color =
    status === "PASSED"
      ? "text-emerald-400"
      : status === "FAILED"
        ? "text-red-400"
        : status === "RUNNING" || status === "ANALYZING" || status === "TOOL_CALL"
          ? "text-yellow-400"
          : "text-[var(--text-secondary)]";
  return <span className={`text-xs ${color}`}>{status}</span>;
}
