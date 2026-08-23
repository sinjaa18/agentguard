"use client";

import { useEffect, useState } from "react";
import { AgentDocument } from "@/types/database";
import { auth } from "@/lib/firebase/client";
import { getAgentScore } from "@/lib/scoring/getAgentScore";

type Props = {
  agent: AgentDocument;
};

export default function Scorecard({ agent }: Props) {
  const [score, setScore] = useState<Awaited<
    ReturnType<typeof getAgentScore>
  > | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setScore(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const result = await getAgentScore(agent.id, user.uid);

        setScore(result);
      } catch (error) {
        console.error("Failed to calculate score:", error);
        setScore(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [agent.id]);

  if (loading || !score) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-6">
        <p className="text-sm text-zinc-500">Calculating reliability...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500">Reliability Score</p>

          <div className="mt-2 flex items-end gap-3">
            <span className="text-5xl font-semibold">{score.overall}</span>

            <span className="mb-1 text-sm text-zinc-500">/ 100</span>
          </div>

          <p className="mt-2 text-xs text-zinc-500">
            {getGrade(score.overall)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-zinc-500">Security</p>

          <p
            className={`mt-1 text-2xl font-semibold ${
              score.security < 70 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {score.security}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <Metric label="Task Success" value={score.taskSuccess} />

        <Metric label="Tool Safety" value={score.toolSafety} />

        <Metric
          label="Instruction Following"
          value={score.instructionFollowing}
        />

        <Metric
          label="Adversarial Robustness"
          value={score.adversarialRobustness}
        />

        <Metric
          label="Hallucination Resistance"
          value={score.hallucinationResistance}
        />

        <Metric label="Goal Stability" value={score.goalStability} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-zinc-500">{label}</span>

        <span>{value}%</span>
      </div>

      <div className="h-1.5 rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function getGrade(score: number) {
  if (score >= 95) return "Grade A+";
  if (score >= 90) return "Grade A";
  if (score >= 85) return "Grade A-";
  if (score >= 80) return "Grade B+";
  if (score >= 75) return "Grade B";
  if (score >= 70) return "Grade B-";
  if (score >= 60) return "Grade C";
  return "Grade D";
}
