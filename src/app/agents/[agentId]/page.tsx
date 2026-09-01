"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { auth } from "@/lib/firebase/client";
import { getUserAgents } from "@/lib/firebase/agents";
import { AgentDocument } from "@/types/database";

export default function AgentDetailsPage() {
  const params = useParams<{ agentId: string }>();
  const router = useRouter();

  const [agent, setAgent] = useState<AgentDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const agents = await getUserAgents(user.uid);

        const found = agents.find((item) => item.id === params.agentId);

        setAgent(found || null);
      } catch (error) {
        console.error("Failed to load agent:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [params.agentId]);

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#0a0a0a] text-white ml-60 p-8">
          <p className="text-sm text-zinc-500">Loading agent...</p>
        </main>
      </ProtectedRoute>
    );
  }

  if (!agent) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#0a0a0a] text-white ml-60 p-8">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm text-red-400">Agent not found.</p>

            <Link
              href="/agents"
              className="mt-4 inline-block text-sm text-zinc-500 hover:text-white"
            >
              ← Back to Agents
            </Link>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#0a0a0a] text-white ml-60 p-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/agents"
            className="text-sm text-zinc-500 hover:text-white"
          >
            ← Back to Agents
          </Link>

          <div className="mt-6 flex items-start justify-between">
            <div>
              <p className="text-xs text-zinc-500">AGENT</p>

              <h1 className="mt-2 text-3xl font-semibold">{agent.name}</h1>

              <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                {agent.description}
              </p>
            </div>

            <button
              onClick={() => {
                router.push("/evaluations");
              }}
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black"
            >
              Evaluate Agent
            </button>
          </div>

          <div className="mt-8 rounded-xl border border-zinc-800 bg-[#0d0d0d] p-6">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <Info label="Model" value={agent.model} />

              <Info label="Version" value={`v${agent.version}`} />

              <Info label="Mode" value={agent.mode} />

              <Info label="Tools" value={String(agent.tools?.length || 0)} />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-6">
              <p className="text-xs text-zinc-500">CAPABILITIES</p>

              <div className="mt-4 space-y-2">
                {agent.capabilities?.length ? (
                  agent.capabilities.map((capability) => (
                    <div
                      key={capability}
                      className="rounded-lg border border-zinc-800 px-3 py-2 text-sm"
                    >
                      {capability}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-600">
                    No capabilities configured.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-6">
              <p className="text-xs text-zinc-500">TOOLS</p>

              <div className="mt-4 space-y-2">
                {agent.tools?.length ? (
                  agent.tools.map((tool) => (
                    <div
                      key={tool.name}
                      className="rounded-lg border border-zinc-800 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{tool.name}</span>

                        <span className="text-xs text-zinc-500">
                          {tool.risk}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-zinc-500">
                        {tool.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-600">No tools configured.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-zinc-800 bg-[#0d0d0d] p-6">
            <p className="text-xs text-zinc-500">QUICK ACTIONS</p>

            <div className="mt-4 flex gap-3">
              <Link
                href="/scenarios"
                className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm"
              >
                Scenarios
              </Link>

              <Link
                href="/evaluations"
                className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm"
              >
                Evaluations
              </Link>

              <Link
                href="/reports"
                className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm"
              >
                Reports
              </Link>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>

      <p className="mt-1 truncate text-sm">{value}</p>
    </div>
  );
}
