"use client";

import { useEffect, useState } from "react";
import { Scenario } from "@/types/scenario";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { getAgentScenarios } from "@/lib/firebase/scenarios";
import { saveGeneratedScenarios } from "@/lib/scenarios/saveGeneratedScenarios";
import { AgentDocument } from "@/types/database";
import AgentSelector from "@/components/agents/AgentSelector";
import { safeGenerateScenarios } from "@/lib/scenarios/safeGenerateScenarios";
import { auth } from "@/lib/firebase/client";

const filters = [
  "ALL",
  "NORMAL",
  "EDGE_CASE",
  "PROMPT_INJECTION",
  "TOOL_ABUSE",
  "DESTRUCTIVE_ACTION",
  "GOAL_DRIFT",
  "HALLUCINATION",
  "TOOL_LOOP",
];

export default function ScenariosPage() {
  const [agent, setAgent] = useState<AgentDocument | null>(null);
  const [agentId, setAgentId] = useState("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [generationSource, setGenerationSource] = useState<
    "GEMINI" | "MOCK" | null
  >(null);

  useEffect(() => {
    if (!agentId) {
      setScenarios([]);
      setGenerationSource(null);
      return;
    }

    const loadScenarios = async () => {
      setLoading(true);

      try {
        const user = auth.currentUser;

        if (!user) {
          setLoading(false);
          return;
        }

        const data = await getAgentScenarios(agentId, user.uid);

        setScenarios(
          data.map((s) => ({
            id: s.id,
            title: s.title,
            category: s.category as Scenario["category"],
            severity: s.severity as Scenario["severity"],
            input: s.input,
            expected: s.expected,
            failure: s.failure,
            tools: s.tools,
            status: s.status,
          })),
        );
      } catch (error) {
        console.error("Failed to load scenarios:", error);
        setScenarios([]);
      } finally {
        setLoading(false);
      }
    };

    loadScenarios();
  }, [agentId]);

  const handleAgentChange = (selected: AgentDocument) => {
    setAgent(selected);
    setAgentId(selected.id);
    setFilter("ALL");
    setGenerationSource(null);
  };

  const generate = async (amount: number) => {
    if (!agent) return;

    setGenerating(true);

    try {
      const result = await safeGenerateScenarios(agent, amount, false);

      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      await saveGeneratedScenarios(agent.id, user.uid, result.scenarios);

      setScenarios(result.scenarios);
      setFilter("ALL");
      setGenerationSource(result.source);
    } catch (error) {
      console.error("Scenario generation failed:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Could not generate scenarios.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const generateAdversarial = async () => {
    if (!agent) return;

    setGenerating(true);

    try {
      const result = await safeGenerateScenarios(agent, 20, true);

      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      await saveGeneratedScenarios(agent.id, user.uid, result.scenarios);

      setScenarios(result.scenarios);
      setFilter("ALL");
      setGenerationSource(result.source);
    } catch (error) {
      console.error("Adversarial generation failed:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Could not generate adversarial scenarios.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const filtered = scenarios.filter(
    (scenario) => filter === "ALL" || scenario.category === filter,
  );

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[var(--bg-base)] text-white ml-60 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs text-[var(--text-muted)]">SCENARIO GENERATOR</p>

              <h1 className="mt-2 text-3xl font-semibold">Test Scenarios</h1>

              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Select an agent and generate reliability and security tests.
              </p>
            </div>

            {agent && (
              <button
                onClick={generateAdversarial}
                disabled={generating}
                className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black disabled:opacity-40"
              >
                {generating ? "Generating..." : "Generate Adversarial Tests"}
              </button>
            )}
          </div>

          <div className="mt-6 max-w-md">
            <p className="mb-2 text-xs text-[var(--text-muted)]">SELECT AGENT</p>

            <AgentSelector value={agentId} onChange={handleAgentChange} />
          </div>

          {!agent && (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Select an agent to start generating scenarios.
              </p>
            </div>
          )}

          {agent && (
            <>
              <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <Info label="Agent" value={agent.name} />

                  <Info label="Model" value={agent.model} />

                  <Info label="Tools" value={String(agent.tools.length)} />

                  <Info label="Mode" value={agent.mode} />
                </div>

                {generationSource && (
                  <div className="mt-4">
                    <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                      Generated by{" "}
                      {generationSource === "GEMINI"
                        ? "Gemini AI"
                        : "Mock Fallback"}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-4">
                <Stat label="Total" value={scenarios.length} />

                <Stat
                  label="Passed"
                  value={scenarios.filter((s) => s.status === "PASSED").length}
                />

                <Stat
                  label="Failed"
                  value={scenarios.filter((s) => s.status === "FAILED").length}
                />
              </div>

              <div className="mt-6 flex gap-2">
                {[10, 25, 50].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => generate(amount)}
                    disabled={generating}
                    className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-zinc-900 disabled:opacity-40"
                  >
                    Generate {amount}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
                {filters.map((category) => (
                  <button
                    key={category}
                    onClick={() => setFilter(category)}
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs ${
                      filter === category
                        ? "bg-white text-black"
                        : "border border-[var(--border)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {category.replaceAll("_", " ")}
                  </button>
                ))}
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
                {loading ? (
                  <div className="p-10 text-center text-sm text-[var(--text-muted)]">
                    Loading scenarios...
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--border)] bg-zinc-900 text-xs text-[var(--text-muted)]">
                      <tr>
                        <th className="p-4 text-left">ID</th>
                        <th className="p-4 text-left">Title</th>
                        <th className="p-4 text-left">Category</th>
                        <th className="p-4 text-left">Severity</th>
                        <th className="p-4 text-left">Tools</th>
                        <th className="p-4 text-left">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filtered.map((scenario) => (
                        <tr
                          key={scenario.id}
                          className="border-t border-zinc-900 hover:bg-zinc-900/40"
                        >
                          <td className="p-4 font-mono text-xs text-[var(--text-muted)]">
                            {scenario.id}
                          </td>

                          <td className="p-4">{scenario.title}</td>

                          <td className="p-4 text-[var(--text-secondary)]">
                            {scenario.category.replaceAll("_", " ")}
                          </td>

                          <td className="p-4">
                            <span
                              className={
                                scenario.severity === "CRITICAL"
                                  ? "text-red-400"
                                  : scenario.severity === "HIGH"
                                    ? "text-orange-400"
                                    : "text-[var(--text-secondary)]"
                              }
                            >
                              {scenario.severity}
                            </span>
                          </td>

                          <td className="p-4 font-mono text-xs text-[var(--text-muted)]">
                            {scenario.tools.join(", ") || "—"}
                          </td>

                          <td className="p-4">
                            <span
                              className={
                                scenario.status === "PASSED"
                                  ? "text-emerald-400"
                                  : scenario.status === "FAILED"
                                    ? "text-red-400"
                                    : "text-[var(--text-muted)]"
                              }
                            >
                              {scenario.status}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {!filtered.length && !loading && (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-10 text-center text-sm text-[var(--text-dim)]"
                          >
                            No scenarios yet. Generate a test set above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
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
