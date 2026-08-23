"use client";

import { useEffect, useState } from "react";
import { AgentDocument } from "@/types/database";
import { getAgentScore } from "@/lib/scoring/getAgentScore";
import { auth } from "@/lib/firebase/client";

export default function SecurityCard({ agent }: { agent: AgentDocument }) {
  const [security, setSecurity] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setSecurity(null);
        return;
      }

      try {
        const score = await getAgentScore(agent.id, user.uid);

        setSecurity(score.security);
      } catch (error) {
        console.error("Failed to calculate security score:", error);
        setSecurity(null);
      }
    };

    load();
  }, [agent.id]);

  if (security === null) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-6">
        <p className="text-sm text-zinc-500">Calculating security...</p>
      </div>
    );
  }

  const critical = security < 70;

  return (
    <div
      className={`rounded-xl border p-6 ${
        critical
          ? "border-red-900 bg-red-950/20"
          : "border-zinc-800 bg-[#0d0d0d]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500">Security Score</p>

          <p
            className={`mt-2 text-4xl font-semibold ${
              critical ? "text-red-400" : "text-white"
            }`}
          >
            {security}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs ${
            critical
              ? "bg-red-950 text-red-400"
              : "bg-emerald-950 text-emerald-400"
          }`}
        >
          {critical ? "Critical Risk" : "Security Healthy"}
        </span>
      </div>

      <div className="mt-6">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Security posture</span>

          <span>{security}%</span>
        </div>

        <div className="mt-2 h-2 rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${security}%` }}
          />
        </div>
      </div>
    </div>
  );
}
