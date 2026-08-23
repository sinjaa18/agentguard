"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Play, ShieldCheck, Trash2 } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { deleteAgent, getUserAgents } from "@/lib/firebase/agents";
import { AgentDocument } from "@/types/database";

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAgents = async () => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const data = await getUserAgents(user.uid);
      setAgents(data);
    } catch (error) {
      console.error("Failed to load agents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const removeAgent = async (id: string) => {
    const confirmed = window.confirm("Delete this agent?");

    if (!confirmed) return;

    try {
      await deleteAgent(id);
      setAgents((current) => current.filter((agent) => agent.id !== id));
    } catch (error) {
      console.error("Failed to delete agent:", error);
      alert("Could not delete agent.");
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white ml-64 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-500">AGENTS</p>

            <h1 className="mt-2 text-3xl font-semibold">Agents</h1>

            <p className="mt-2 text-sm text-zinc-500">
              Configure and evaluate your AI agents.
            </p>
          </div>

          <Link
            href="/agents/new"
            className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black"
          >
            + Add Agent
          </Link>
        </div>

        {loading && (
          <div className="mt-8 rounded-xl border border-zinc-800 bg-[#0d0d0d] p-8 text-center">
            <p className="text-sm text-zinc-500">Loading agents...</p>
          </div>
        )}

        {!loading && agents.length === 0 && (
          <div className="mt-8 rounded-xl border border-dashed border-zinc-800 bg-[#0d0d0d] p-12 text-center">
            <Bot className="mx-auto text-zinc-600" size={32} />

            <h2 className="mt-4 font-medium">No agents yet</h2>

            <p className="mt-2 text-sm text-zinc-500">
              Create your first AI agent to start testing.
            </p>

            <Link
              href="/agents/new"
              className="mt-5 inline-block rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black"
            >
              Create Agent
            </Link>
          </div>
        )}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-xl border border-zinc-800 bg-[#0d0d0d]"
            >
              <div className="flex items-start justify-between border-b border-zinc-800 p-6">
                <div className="flex gap-4">
                  <div className="rounded-lg bg-zinc-900 p-3">
                    <Bot size={20} />
                  </div>

                  <div>
                    <h2 className="font-medium">{agent.name}</h2>

                    <p className="mt-1 text-sm text-zinc-500">
                      {agent.description || "No description"}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-zinc-900 px-2 py-1 text-[11px] text-zinc-400">
                  {agent.mode}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 p-6">
                <Info label="Model" value={agent.model} />

                <Info label="Version" value={`v${agent.version}`} />

                <Info
                  label="Capabilities"
                  value={String(agent.capabilities.length)}
                />
              </div>

              <div className="border-t border-zinc-800 p-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} />
                  <p className="text-sm font-medium">Capabilities</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {agent.capabilities.length > 0 ? (
                    agent.capabilities.map((capability) => (
                      <span
                        key={capability}
                        className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400"
                      >
                        {capability}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-600">
                      No capabilities configured
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 border-t border-zinc-800 p-6">
                <Link
                  href={`/agents/${agent.id}`}
                  className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black"
                >
                  <Play size={14} />
                  Evaluate
                </Link>

                <button
                  onClick={() => removeAgent(agent.id)}
                  className="flex items-center gap-2 rounded-lg border border-red-950 px-4 py-2.5 text-sm text-red-400"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>

      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
