"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AgentSelector from "@/components/agents/AgentSelector";
import { auth } from "@/lib/firebase/client";
import { getAgentScenarios } from "@/lib/firebase/scenarios";
import { AgentDocument, ScenarioDocument } from "@/types/database";

const categories = [
  "NORMAL",
  "EDGE_CASE",
  "PROMPT_INJECTION",
  "TOOL_ABUSE",
  "DESTRUCTIVE_ACTION",
  "GOAL_DRIFT",
  "HALLUCINATION",
  "TOOL_LOOP",
];

export default function TestSuitesPage() {
  const [agent, setAgent] = useState<AgentDocument | null>(null);
  const [agentId, setAgentId] = useState("");
  const [scenarios, setScenarios] = useState<ScenarioDocument[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentId) {
      setScenarios([]);
      return;
    }

    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setScenarios([]);
        return;
      }

      setLoading(true);

      try {
        const data = await getAgentScenarios(agentId, user.uid);

        setScenarios(data);
      } catch (error) {
        console.error("Failed to load test suite:", error);
        setScenarios([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [agentId]);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[var(--bg-base)] text-white ml-60 p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs text-[var(--text-muted)]">TEST SUITE</p>

          <h1 className="mt-2 text-3xl font-semibold">Agent Security Suite</h1>

          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Reliability and security tests for the selected AI agent.
          </p>

          <div className="mt-6 max-w-md">
            <p className="mb-2 text-xs text-[var(--text-muted)]">SELECT AGENT</p>

            <AgentSelector
              value={agentId}
              onChange={(selected) => {
                setAgent(selected);
                setAgentId(selected.id);
              }}
            />
          </div>

          {!agent && (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Select an agent to view its test suite.
              </p>
            </div>
          )}

          {agent && (
            <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">TOTAL SCENARIOS</p>

                  <p className="mt-1 text-3xl font-semibold">
                    {loading ? "—" : scenarios.length}
                  </p>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">{agent.name}</p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href="/evaluations"
                    className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black"
                  >
                    Run All
                  </Link>

                  <Link
                    href="/evaluations"
                    className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm"
                  >
                    Run Failed
                  </Link>

                  <Link
                    href="/evaluations"
                    className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm"
                  >
                    Run Critical
                  </Link>
                </div>
              </div>

              {loading ? (
                <div className="mt-8 p-10 text-center text-sm text-[var(--text-muted)]">
                  Loading test suite...
                </div>
              ) : (
                <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                  {categories.map((category) => {
                    const count = scenarios.filter(
                      (scenario) => scenario.category === category,
                    ).length;

                    return (
                      <div
                        key={category}
                        className="rounded-lg border border-[var(--border)] p-4"
                      >
                        <p className="text-xs text-[var(--text-muted)]">
                          {category.replaceAll("_", " ")}
                        </p>

                        <p className="mt-2 text-2xl font-semibold">{count}</p>

                        <p className="mt-1 text-xs text-[var(--text-dim)]">scenarios</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loading && scenarios.length === 0 && (
                <div className="mt-6 rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
                  <p className="text-sm text-[var(--text-muted)]">
                    No scenarios have been generated for this agent.
                  </p>

                  <Link
                    href="/scenarios"
                    className="mt-4 inline-block rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black"
                  >
                    Generate Scenarios
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
