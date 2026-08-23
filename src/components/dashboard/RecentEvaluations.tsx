"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AgentDocument } from "@/types/database";
import { getAgentEvaluations } from "@/lib/firebase/evaluations";
import { auth } from "@/lib/firebase/client";

type EvaluationRow = {
  id: string;
  total: number;
  passed: number;
  failed: number;
  status: string;
};

export default function RecentEvaluations({ agent }: { agent: AgentDocument }) {
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setEvaluations([]);
        return;
      }

      try {
        const data = await getAgentEvaluations(agent.id, user.uid);

        setEvaluations(
          data
            .slice(-5)
            .reverse()
            .map((item) => ({
              id: item.id,
              total: item.total,
              passed: item.passed,
              failed: item.failed,
              status: item.status,
            })),
        );
      } catch (error) {
        console.error("Failed to load recent evaluations:", error);
        setEvaluations([]);
      }
    };

    load();
  }, [agent.id]);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#0d0d0d]">
      <div className="border-b border-zinc-800 p-6">
        <h3 className="font-medium">Recent Evaluations</h3>

        <p className="mt-1 text-xs text-zinc-500">
          Latest runs for {agent.name}
        </p>
      </div>

      {evaluations.length === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-600">
          No evaluations yet.
        </div>
      ) : (
        <div className="divide-y divide-zinc-900">
          {evaluations.map((evaluation) => (
            <Link
              key={evaluation.id}
              href={`/evaluations/${evaluation.id}`}
              className="flex items-center justify-between p-5 hover:bg-zinc-900/40"
            >
              <div>
                <p className="font-mono text-sm">{evaluation.id}</p>

                <p className="mt-1 text-xs text-zinc-500">
                  {evaluation.passed} passed · {evaluation.failed} failed ·{" "}
                  {evaluation.total} total
                </p>
              </div>

              <span
                className={
                  evaluation.status === "COMPLETED"
                    ? "text-xs text-emerald-400"
                    : "text-xs text-yellow-400"
                }
              >
                {evaluation.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
