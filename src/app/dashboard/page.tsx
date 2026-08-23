"use client";

import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import Scorecard from "@/components/dashboard/Scorecard";
import KpiCards from "@/components/dashboard/KpiCards";
import ReliabilityChart from "@/components/dashboard/ReliabilityChart";
import FailureChart from "@/components/dashboard/FailureChart";
import RecentEvaluations from "@/components/dashboard/RecentEvaluations";
import SecurityCard from "@/components/dashboard/SecurityCard";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useState } from "react";
import { AgentDocument } from "@/types/database";
import AgentSelector from "@/components/agents/AgentSelector";

export default function Dashboard() {
  const [agent, setAgent] = useState<AgentDocument | null>(null);
  const [agentId, setAgentId] = useState("");

  const handleAgentChange = (selected: AgentDocument) => {
    setAgent(selected);
    setAgentId(selected.id);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Sidebar />

        <div className="ml-64">
          <Header />

          <main className="space-y-6 p-6">
            <div>
              <h2 className="text-2xl font-semibold">Overview</h2>

              <p className="mt-1 text-sm text-zinc-500">
                Monitor the reliability and security of your AI agents.
              </p>
            </div>

            <div className="max-w-md">
              <p className="mb-2 text-xs text-zinc-500">SELECT AGENT</p>

              <AgentSelector value={agentId} onChange={handleAgentChange} />
            </div>

            {!agent && (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-[#0d0d0d] p-8 text-center">
                <p className="text-sm text-zinc-500">
                  Select an agent to view its reliability dashboard.
                </p>
              </div>
            )}

            {agent && (
              <>
                <div className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-5">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Info label="Agent" value={agent.name} />

                    <Info label="Model" value={agent.model} />

                    <Info label="Version" value={`v${agent.version}`} />

                    <Info label="Mode" value={agent.mode} />
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <Scorecard agent={agent} />
                  <SecurityCard agent={agent} />
                </div>
              </>
            )}

            {agent && <KpiCards agent={agent} />}

            <div className="grid gap-6 xl:grid-cols-2">
              {agent && <ReliabilityChart agent={agent} />}
              {agent && <FailureChart agent={agent} />}
            </div>

            {agent && <RecentEvaluations agent={agent} />}
          </main>
        </div>
      </div>
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
