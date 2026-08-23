"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AgentSelector from "@/components/agents/AgentSelector";
import { AgentDocument, FailureDocument } from "@/types/database";
import { getAgentFailures } from "@/lib/firebase/evaluations";
import { auth } from "@/lib/firebase/client";

export default function FailuresPage() {
  const [agent, setAgent] = useState<AgentDocument | null>(null);
  const [agentId, setAgentId] = useState("");
  const [failures, setFailures] = useState<FailureDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FailureDocument | null>(null);

  useEffect(() => {
    if (!agentId) {
      setFailures([]);
      setSelected(null);
      return;
    }

    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setFailures([]);
        return;
      }

      setLoading(true);

      try {
        const data = await getAgentFailures(agentId, user.uid);

        setFailures(data);
      } catch (error) {
        console.error("Failed to load failures:", error);
        setFailures([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [agentId]);

  const filtered = failures.filter((failure) => {
    const query = search.toLowerCase();

    return (
      failure.title.toLowerCase().includes(query) ||
      failure.category.toLowerCase().includes(query) ||
      failure.scenarioId.toLowerCase().includes(query)
    );
  });

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#0a0a0a] text-white ml-64 p-8">
        <div className="mx-auto max-w-7xl">
          <div>
            <p className="text-xs text-zinc-500">FAILURE ANALYSIS</p>

            <h1 className="mt-2 text-3xl font-semibold">Detected Failures</h1>

            <p className="mt-2 text-sm text-zinc-500">
              Findings detected during real agent evaluations.
            </p>
          </div>

          <div className="mt-6 max-w-md">
            <p className="mb-2 text-xs text-zinc-500">SELECT AGENT</p>

            <AgentSelector
              value={agentId}
              onChange={(selectedAgent) => {
                setAgent(selectedAgent);
                setAgentId(selectedAgent.id);
                setSelected(null);
              }}
            />
          </div>

          {!agent && (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-800 bg-[#0d0d0d] p-10 text-center">
              <p className="text-sm text-zinc-500">
                Select an agent to view its failures.
              </p>
            </div>
          )}

          {agent && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat label="Total Failures" value={failures.length} />

                <Stat
                  label="Critical"
                  value={
                    failures.filter((f) => f.severity === "CRITICAL").length
                  }
                />

                <Stat
                  label="High"
                  value={failures.filter((f) => f.severity === "HIGH").length}
                />

                <Stat
                  label="Security Issues"
                  value={
                    failures.filter(
                      (f) =>
                        f.category === "PROMPT_INJECTION" ||
                        f.category === "UNSAFE_ACTION" ||
                        f.category === "TOOL_MISUSE",
                    ).length
                  }
                />
              </div>

              <div className="mt-6 relative">
                <Search
                  size={16}
                  className="absolute left-3 top-3 text-zinc-600"
                />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search failures..."
                  className="w-full rounded-lg border border-zinc-800 bg-[#0d0d0d] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-zinc-600"
                />
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-[#0d0d0d]">
                {loading ? (
                  <div className="p-10 text-center text-sm text-zinc-500">
                    Loading failures...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-sm text-zinc-500">No failures found.</p>

                    <p className="mt-2 text-xs text-zinc-700">
                      Run an evaluation to generate findings.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b border-zinc-800 bg-zinc-900 text-xs text-zinc-500">
                      <tr>
                        <th className="p-4 text-left">Failure</th>
                        <th className="p-4 text-left">Severity</th>
                        <th className="p-4 text-left">Category</th>
                        <th className="p-4 text-left">Scenario</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filtered.map((failure) => (
                        <tr
                          key={failure.id}
                          onClick={() => setSelected(failure)}
                          className="cursor-pointer border-t border-zinc-900 hover:bg-zinc-900/50"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {failure.severity === "CRITICAL" && (
                                <AlertTriangle
                                  size={15}
                                  className="text-red-400"
                                />
                              )}

                              <div>
                                <p className="font-medium">{failure.title}</p>

                                <p className="mt-1 font-mono text-xs text-zinc-600">
                                  {failure.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <Severity severity={failure.severity} />
                          </td>

                          <td className="p-4 text-xs text-zinc-400">
                            {failure.category.replaceAll("_", " ")}
                          </td>

                          <td className="p-4 font-mono text-xs text-zinc-500">
                            {failure.scenarioId}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {selected && (
            <FailureDetails
              failure={selected}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}

function FailureDetails({
  failure,
  onClose,
}: {
  failure: FailureDocument;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-6 backdrop-blur-sm">
      <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-xl border border-zinc-800 bg-[#0d0d0d]">
        <div className="flex items-center justify-between border-b border-zinc-800 p-6">
          <div>
            <p className="font-mono text-xs text-zinc-600">{failure.id}</p>

            <h2 className="mt-1 text-xl font-semibold">{failure.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="text-sm text-zinc-500 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex gap-2">
            <Severity severity={failure.severity} />

            <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400">
              {failure.category.replaceAll("_", " ")}
            </span>
          </div>

          <Field title="Scenario" value={failure.scenarioId} />

          <Field title="Observed Behavior" value={failure.observedBehavior} />

          <Field title="Expected Behavior" value={failure.expectedBehavior} />

          <Field title="Risk" value={failure.risk} />

          <Field title="Root Cause" value={failure.rootCause} />

          <Field title="Recommended Fix" value={failure.recommendedFix} />
        </div>
      </div>
    </div>
  );
}

function Severity({ severity }: { severity: string }) {
  const style =
    severity === "CRITICAL"
      ? "bg-red-950 text-red-400"
      : severity === "HIGH"
        ? "bg-orange-950 text-orange-400"
        : severity === "MEDIUM"
          ? "bg-yellow-950 text-yellow-400"
          : "bg-zinc-900 text-zinc-400";

  return (
    <span className={`rounded-full px-2 py-1 text-xs ${style}`}>
      {severity}
    </span>
  );
}

function Field({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{title}</p>

      <p className="mt-2 text-sm leading-6 text-zinc-300">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-5">
      <p className="text-xs text-zinc-500">{label}</p>

      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
