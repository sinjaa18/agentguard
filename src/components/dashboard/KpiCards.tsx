"use client";

import { useEffect, useState } from "react";
import { AgentDocument } from "@/types/database";
import { auth } from "@/lib/firebase/client";
import { getDashboardData } from "@/lib/dashboard/getDashboardData";

export default function KpiCards({ agent }: { agent: AgentDocument }) {
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getDashboardData>
  > | null>(null);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setData(null);
        return;
      }

      try {
        const result = await getDashboardData(agent.id, user.uid);

        setData(result);
      } catch (error) {
        console.error("Failed to load dashboard KPIs:", error);
        setData(null);
      }
    };

    load();
  }, [agent.id]);

  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-24 rounded-xl border border-zinc-800 bg-[#0d0d0d]"
          />
        ))}
      </div>
    );
  }

  const cards = [
    ["Evaluations", data.evaluations],
    ["Scenarios", data.scenarios],
    ["Failures", data.failures],
    ["Critical Failures", data.criticalFailures],
    ["Reliability", `${data.averageReliability}%`],
  ];

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
      {cards.map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-4"
        >
          <p className="text-xs text-zinc-500">{label}</p>

          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}
