"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AgentDocument } from "@/types/database";
import { getAgentEvaluations } from "@/lib/firebase/evaluations";
import { auth } from "@/lib/firebase/client";

export default function ReliabilityChart({ agent }: { agent: AgentDocument }) {
  const [data, setData] = useState<{ name: string; score: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setData([]);
        return;
      }

      try {
        const evaluations = await getAgentEvaluations(agent.id, user.uid);

        const result = evaluations
          .filter((evaluation) => evaluation.total > 0)
          .map((evaluation, index) => ({
            name: `Run ${index + 1}`,
            score: Math.round((evaluation.passed / evaluation.total) * 100),
          }));

        setData(result);
      } catch (error) {
        console.error("Failed to load reliability history:", error);
        setData([]);
      }
    };

    load();
  }, [agent.id]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-6">
      <h3 className="font-medium">Reliability Trend</h3>

      <p className="mt-1 text-xs text-zinc-500">
        Evaluation reliability over time
      </p>

      <div className="mt-5 h-64">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">
            No evaluation history yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="#27272a" vertical={false} />

              <XAxis dataKey="name" stroke="#71717a" fontSize={12} />

              <YAxis domain={[0, 100]} stroke="#71717a" fontSize={12} />

              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                }}
              />

              <Line
                type="monotone"
                dataKey="score"
                stroke="#fff"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
