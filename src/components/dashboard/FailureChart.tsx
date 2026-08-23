"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { AgentDocument } from "@/types/database";
import { getAgentFailures } from "@/lib/firebase/evaluations";
import { auth } from "@/lib/firebase/client";

const COLORS = [
  "#ffffff",
  "#a1a1aa",
  "#71717a",
  "#52525b",
  "#3f3f46",
  "#27272a",
];

export default function FailureChart({ agent }: { agent: AgentDocument }) {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setData([]);
        return;
      }

      try {
        const failures = await getAgentFailures(agent.id, user.uid);

        const counts: Record<string, number> = {};

        failures.forEach((failure) => {
          counts[failure.category] = (counts[failure.category] || 0) + 1;
        });

        setData(
          Object.entries(counts).map(([name, value]) => ({
            name,
            value,
          })),
        );
      } catch (error) {
        console.error("Failed to load failure chart:", error);
        setData([]);
      }
    };

    load();
  }, [agent.id]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-6">
      <h3 className="font-medium">Failure Distribution</h3>

      <p className="mt-1 text-xs text-zinc-500">
        Failures detected for this agent
      </p>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-zinc-600">
          No failures yet.
        </div>
      ) : (
        <>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {data.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {data.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center gap-2 text-zinc-400"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: COLORS[index % COLORS.length],
                  }}
                />

                {item.name.replaceAll("_", " ")}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
