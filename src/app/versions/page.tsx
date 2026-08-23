"use client";

import { useEffect, useState } from "react";
import AgentSelector from "@/components/agents/AgentSelector";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { AgentDocument } from "@/types/database";
import {
  getAgentVersions,
  VersionMetric,
} from "@/lib/versions/getAgentVersions";
import { auth } from "@/lib/firebase/client";

export default function VersionsPage() {
  const [agent, setAgent] = useState<AgentDocument | null>(null);
  const [agentId, setAgentId] = useState("");
  const [versions, setVersions] = useState<VersionMetric[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentId) {
      setVersions([]);
      return;
    }

    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setVersions([]);
        return;
      }

      setLoading(true);

      try {
        const data = await getAgentVersions(agentId, user.uid);

        setVersions(data);
      } catch (error) {
        console.error("Failed to load versions:", error);
        setVersions([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [agentId]);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#0a0a0a] text-white ml-64 p-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs text-zinc-500">VERSION COMPARISON</p>

          <h1 className="mt-2 text-3xl font-semibold">Agent Versions</h1>

          <p className="mt-2 text-sm text-zinc-500">
            Compare evaluation performance across runs.
          </p>

          <div className="mt-6 max-w-md">
            <p className="mb-2 text-xs text-zinc-500">SELECT AGENT</p>

            <AgentSelector
              value={agentId}
              onChange={(selected) => {
                setAgent(selected);
                setAgentId(selected.id);
              }}
            />
          </div>

          {!agent && (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-800 p-10 text-center">
              <p className="text-sm text-zinc-500">
                Select an agent to compare its evaluation history.
              </p>
            </div>
          )}

          {agent && (
            <div className="mt-8">
              {loading ? (
                <p className="text-sm text-zinc-500">
                  Loading evaluation history...
                </p>
              ) : versions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
                  <p className="text-sm text-zinc-500">
                    No completed evaluations yet.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    {versions.map((version, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-5"
                      >
                        <p className="text-xs text-zinc-500">
                          {version.version}
                        </p>

                        <p className="mt-3 text-3xl font-semibold">
                          {version.reliability}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          Reliability
                        </p>

                        <div className="mt-4 text-xs text-zinc-500">
                          {version.failed} failed / {version.total} scenarios
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-[#0d0d0d]">
                    <table className="w-full text-sm">
                      <thead className="border-b border-zinc-800 text-xs text-zinc-500">
                        <tr>
                          <th className="p-4 text-left">Run</th>
                          <th className="p-4 text-left">Reliability</th>
                          <th className="p-4 text-left">Task Success</th>
                          <th className="p-4 text-left">Failed</th>
                          <th className="p-4 text-left">Total</th>
                        </tr>
                      </thead>

                      <tbody>
                        {versions.map((version, index) => (
                          <tr key={index} className="border-t border-zinc-900">
                            <td className="p-4">{version.version}</td>

                            <td className="p-4">{version.reliability}%</td>

                            <td className="p-4">{version.taskSuccess}%</td>

                            <td className="p-4 text-red-400">
                              {version.failed}
                            </td>

                            <td className="p-4">{version.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
