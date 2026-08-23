"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import { getEvaluationTraces } from "@/lib/firebase/evaluations";
import { auth } from "@/lib/firebase/client";
import { ExecutionTraceDocument } from "@/types/database";

export default function TracePage() {
  const params = useParams<{
    evaluationId: string;
    scenarioId: string;
  }>();

  const evaluationId = params.evaluationId;
  const scenarioId = params.scenarioId;

  const [trace, setTrace] = useState<ExecutionTraceDocument | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const traces = await getEvaluationTraces(evaluationId, user.uid);

        const found = traces.find((item) => item.scenarioId === scenarioId);

        setTrace(found || null);
      } catch (error) {
        console.error("Failed to load execution trace:", error);
        setTrace(null);
      } finally {
        setLoading(false);
      }
    };

    if (evaluationId && scenarioId) {
      load();
    }
  }, [evaluationId, scenarioId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white ml-64 p-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-zinc-500">Loading execution trace...</p>
        </div>
      </main>
    );
  }

  if (!trace) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white ml-64 p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/evaluations/${evaluationId}`}
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Back to Evaluation
        </Link>

        <div className="mt-6">
          <p className="text-xs text-zinc-500">EXECUTION TRACE</p>

          <h1 className="mt-2 font-mono text-2xl font-semibold">
            {scenarioId}
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Evaluation: {evaluationId}
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-zinc-800 bg-[#0d0d0d] p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Execution Events</h2>

            <span
              className={
                trace.status === "PASSED"
                  ? "text-xs text-emerald-400"
                  : "text-xs text-red-400"
              }
            >
              {trace.status}
            </span>
          </div>

          <div className="mt-5 rounded-lg bg-black p-5 font-mono text-xs text-zinc-400">
            {trace.events.map((event, index) => (
              <div key={index}>
                <span className="text-zinc-600">[{event.time}]</span>{" "}
                {event.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
