"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AgentSelector from "@/components/agents/AgentSelector";
import { getAgentScenarios } from "@/lib/firebase/scenarios";
import { Evaluation } from "@/lib/evaluation/types";
import { Scenario } from "@/types/scenario";
import { AgentDocument, EvaluationDocument } from "@/types/database";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAgentEvaluations } from "@/lib/firebase/evaluations";
import { BUILTIN_REDTEAM_SUITE } from "@/lib/ai-evaluation/redteamScenarios";
import { EvaluationResponseError, readEvaluationResponse } from "@/lib/evaluation/evaluationResponse";
import { MAX_SAVED_SCENARIOS_PER_RUN, reconcileScenarioSelection, updateScenarioSelection } from "@/lib/evaluation/scenarioSelection";

function EvaluationsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: signedInUser } = useAuth();
  const signedInUserId = signedInUser?.uid;

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [running, setRunning] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);
  const [selectionLimitMessage, setSelectionLimitMessage] = useState("");
  const [agent, setAgent] = useState<AgentDocument | null>(null);
  const [agentId, setAgentId] = useState(searchParams.get("agentId") ?? "");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<EvaluationDocument[]>([]);
  const [suiteId, setSuiteId] = useState<"saved" | "agentguard-redteam-v1">("saved");
  const [mode, setMode] = useState<"GEMINI" | "DETERMINISTIC">("GEMINI");
  const [lastRunReport, setLastRunReport] = useState<Record<string, unknown> | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const selectedCount = suiteId === "agentguard-redteam-v1" ? BUILTIN_REDTEAM_SUITE.cases.length : selectedScenarioIds.length;

  // Load scenarios + history whenever agent changes
  useEffect(() => {
    let active = true;
    if (!agentId) {
      setScenarios([]);
      setSelectedScenarioIds([]);
      setHistory([]);
      setLoading(false);
      return () => { active = false; };
    }

    const load = async () => {
      if (!signedInUserId) {
        setScenarios([]);
        setSelectedScenarioIds([]);
        setHistory([]);
        setEvaluation(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setEvaluation(null);

      try {
        const [scenarioData, evaluationData] = await Promise.all([
          getAgentScenarios(agentId, signedInUserId),
          getAgentEvaluations(agentId, signedInUserId),
        ]);

        if (!active) return;

        const loadedScenarios = scenarioData.map((s) => ({
            id: s.id,
            title: s.title,
            category: s.category as Scenario["category"],
            severity: s.severity as Scenario["severity"],
            input: s.input,
            expected: s.expected,
            failure: s.failure,
            tools: s.tools || [],
            status: s.status,
          }));
        setScenarios(loadedScenarios);
        const availableIds = loadedScenarios.map((scenario) => scenario.id);
        setSelectedScenarioIds((current) => reconcileScenarioSelection(current, availableIds));
        setSelectionLimitMessage("");

        setHistory(evaluationData);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load evaluation data:", error);
        setScenarios([]);
        setSelectedScenarioIds([]);
        setHistory([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [agentId, signedInUserId]);

  const handleAgentChange = useCallback((selected: AgentDocument) => {
    setAgent(selected);
    setAgentId(selected.id);
    setScenarios([]);
    setSelectedScenarioIds([]);
    setSelectionLimitMessage("");
    setHistory([]);
    setEvaluation(null);
    setLastRunReport(null);
  }, []);

  const handleScenarioSelection = (scenarioId: string, shouldSelect: boolean) => {
    const result = updateScenarioSelection(
      selectedScenarioIds,
      scenarioId,
      shouldSelect,
      scenarios.map((scenario) => scenario.id),
    );
    setSelectedScenarioIds(result.selectedIds);
    setSelectionLimitMessage(result.limitReached
      ? `An evaluation can include at most ${MAX_SAVED_SCENARIOS_PER_RUN} saved scenarios. Deselect one before choosing another.`
      : "");
  };

  const start = async () => {
    if (running) {
      requestController.current?.abort();
      return;
    }
    if (!agent || selectedCount === 0 || (suiteId === "saved" && selectedScenarioIds.length > MAX_SAVED_SCENARIOS_PER_RUN)) return;

    const user = signedInUser;

    if (!user) {
      alert("Please sign in first.");
      return;
    }

    setRunning(true);
    setEvaluation(null);
    setLastRunReport(null);
    const controller = new AbortController();
    requestController.current = controller;

    try {
      let response: Response;
      try {
        const idToken = await user.getIdToken();
        response = await fetch("/api/evaluations/run", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            agentId: agent.id,
            suiteId,
            scenarioIds: suiteId === "saved" ? [...selectedScenarioIds] : undefined,
            mode,
          }),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        throw new EvaluationResponseError("Could not reach the evaluation service. Check your connection and retry.");
      }
      const data = await readEvaluationResponse(response);
      const report = data.report;
      const runResults = Array.isArray(report.results) ? report.results as Record<string, unknown>[] : [];
      const executions = runResults.map((item) => {
        const tools = Array.isArray(item.tools) ? item.tools as Record<string, unknown>[] : [];
        const selectedTool = tools.find((tool) => typeof tool.name === "string");
        return {
          scenarioId: String(item.scenarioId), status: item.passed ? "PASSED" as const : item.status === "UNJUDGEABLE" ? "UNJUDGEABLE" as const : "FAILED" as const,
          events: Array.isArray(item.events) ? item.events as { time: string; message: string }[] : [],
          agentResponse: String(item.response ?? ""), toolUsed: selectedTool ? String(selectedTool.name) : undefined,
          toolResult: JSON.stringify(tools.map((tool) => ({ name: tool.name, status: tool.status, result: tool.result }))),
          passed: Boolean(item.passed),
          reason: String((item.judge as Record<string, unknown> | undefined)?.rationale ?? item.errorCategory ?? "No judge result."),
          riskScore: Number(item.riskScore ?? 0),
        };
      });
      setEvaluation({ id: String(data.evaluationId), total: Number(data.total), completed: Number(data.completed), passed: Number(data.passed), failed: Number(data.failed), unjudgeable: Number(data.unjudgeable ?? 0), status: data.status, executions });
      setLastRunReport(report);
      setHistory(await getAgentEvaluations(agent.id, user.uid));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") alert("The request was cancelled. If the server had started the run, it records the run as cancelled.");
      else alert(error instanceof EvaluationResponseError ? error.message : "Evaluation failed. Check the server configuration and try again.");
    } finally {
      requestController.current = null;
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

          {agent && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block text-xs text-[var(--text-muted)]">
                EVALUATION SUITE
                <select value={suiteId} onChange={(event) => { setSuiteId(event.target.value as typeof suiteId); setEvaluation(null); setLastRunReport(null); }} className="mt-2 block w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm text-white">
                  <option value="saved">Saved scenarios ({scenarios.length})</option>
                  <option value="agentguard-redteam-v1">AgentGuard red-team v1 ({BUILTIN_REDTEAM_SUITE.cases.length})</option>
                </select>
              </label>
              <label className="block text-xs text-[var(--text-muted)]">
                RUNNER MODE
                <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)} className="mt-2 block w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm text-white">
                  <option value="GEMINI">Live Gemini agent simulation + judge</option>
                  <option value="DETERMINISTIC">Offline synthetic evaluator fixture</option>
                </select>
              </label>
              <p className="md:col-span-2 text-xs text-[var(--text-muted)]">
                {mode === "GEMINI" ? "Gemini simulates the configured system prompt. Tool calls run only in the mock environment; this does not execute an arbitrary external agent." : "Offline mode uses synthetic responses to check evaluator behavior; it does not run or score the configured agent."}
              </p>
            </div>
          )}

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
                  <Info label="Scenarios" value={suiteId === "saved" ? `${selectedCount} / ${MAX_SAVED_SCENARIOS_PER_RUN} selected` : String(selectedCount)} />
                </div>
              </div>

              {suiteId === "saved" && (
                <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5" aria-labelledby="saved-scenarios-heading">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 id="saved-scenarios-heading" className="font-medium">Choose saved scenarios</h2>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Select up to {MAX_SAVED_SCENARIOS_PER_RUN} scenarios per evaluation.
                      </p>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]" aria-live="polite">
                      {selectedCount} / {MAX_SAVED_SCENARIOS_PER_RUN} selected
                    </p>
                  </div>
                  {(selectionLimitMessage || selectedScenarioIds.length >= MAX_SAVED_SCENARIOS_PER_RUN) && (
                    <p role="status" className="mt-3 text-xs text-amber-300">
                      {selectionLimitMessage || `Limit reached: evaluations accept up to ${MAX_SAVED_SCENARIOS_PER_RUN} saved scenarios. Deselect one to choose another.`}
                    </p>
                  )}
                  {loading ? (
                    <p className="mt-4 text-sm text-[var(--text-muted)]">Loading saved scenarios...</p>
                  ) : scenarios.length === 0 ? (
                    <p className="mt-4 text-sm text-[var(--text-muted)]">No saved scenarios are available for this agent.</p>
                  ) : (
                    <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
                      {scenarios.map((scenario) => {
                        const checked = selectedScenarioIds.includes(scenario.id);
                        const limitReached = selectedScenarioIds.length >= MAX_SAVED_SCENARIOS_PER_RUN;
                        return (
                          <label key={scenario.id} className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={running || (!checked && limitReached)}
                              onChange={(event) => handleScenarioSelection(scenario.id, event.target.checked)}
                              className="mt-0.5 accent-white"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-white">{scenario.title}</span>
                              <span className="mt-1 block text-xs text-[var(--text-muted)]">
                                {scenario.category.replaceAll("_", " ")} · {scenario.severity}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  {loading
                    ? "Loading scenarios..."
                    : suiteId === "saved" && scenarios.length === 0
                      ? "No scenarios — generate them first."
                      : suiteId === "saved"
                        ? `${selectedCount} / ${MAX_SAVED_SCENARIOS_PER_RUN} saved scenarios selected.`
                        : `${selectedCount} scenarios ready.`}
                </p>

                {suiteId === "saved" && scenarios.length === 0 && !loading && (
                  <Link
                    href="/scenarios"
                    className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900"
                  >
                    Generate Scenarios
                  </Link>
                )}

                <button
                  onClick={start}
                  disabled={!running && (loading || selectedCount === 0 || (suiteId === "saved" && (selectedScenarioIds.length === 0 || selectedScenarioIds.length > MAX_SAVED_SCENARIOS_PER_RUN)))}
                  className={`rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50 ${running ? "border border-red-900 text-red-300" : "bg-white text-black"}`}
                >
                  {running
                    ? "Cancel Run"
                    : loading
                      ? "Loading..."
                      : suiteId === "saved" && scenarios.length === 0
                        ? "No Scenarios"
                        : suiteId === "saved" && selectedScenarioIds.length === 0
                          ? "Select Scenarios"
                          : "Run Evaluation"}
                </button>
              </div>

              {evaluation && (
                <>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-4 text-sm">
                    <span>Run <code>{evaluation.id}</code> · {mode === "GEMINI" ? "Live Gemini" : "Synthetic fixture"}</span>
                    <div className="flex gap-2">
                      <Link href={`/evaluations/${evaluation.id}`} className="rounded-lg border border-zinc-700 px-3 py-2">Open run details</Link>
                      {lastRunReport && <button onClick={() => downloadReport(lastRunReport, evaluation.id)} className="rounded-lg border border-zinc-700 px-3 py-2">Export JSON</button>}
                    </div>
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Stat label="Progress" value={`${evaluation.completed}/${evaluation.total}`} />
                    <Stat label="Passed" value={evaluation.passed} />
                    <Stat label="Failed" value={evaluation.failed} />
                    <Stat label="Unjudgeable" value={evaluation.unjudgeable ?? 0} />
                    <Stat label="Status" value={evaluation.status} />
                  </div>

                  <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
                    <div className="border-b border-[var(--border)] p-5">
                      <h2 className="font-medium">Execution</h2>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Ordered execution events and evidence</p>
                    </div>

                    <div className="divide-y divide-zinc-900">
                      {evaluation.executions.map((execution) => {
                        const scenario = scenarios.find((item) => item.id === execution.scenarioId);
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

                    {(evaluation.status === "COMPLETED" || evaluation.status === "PARTIAL" || evaluation.status === "CANCELLED") && (
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
                    <th className="p-4 text-left">Unjudgeable</th>
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
                      <td className="p-4 text-amber-300">{item.unjudgeable ?? 0}</td>
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
        : status === "UNJUDGEABLE" || status === "RUNNING" || status === "ANALYZING" || status === "TOOL_CALL" || status === "PARTIAL"
          ? "text-yellow-400"
          : "text-[var(--text-secondary)]";
  return <span className={`text-xs ${color}`}>{status}</span>;
}

function downloadReport(report: Record<string, unknown>, evaluationId: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `agentguard-${evaluationId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
