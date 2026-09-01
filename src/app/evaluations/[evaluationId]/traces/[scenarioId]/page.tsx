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
      <main className="min-h-screen bg-[#0a0a0a] text-white ml-60 p-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-zinc-500">Loading execution trace...</p>
        </div>
      </main>
    );
  }

  if (!trace) {
    notFound();
  }

  const riskColor =
    (trace.riskScore ?? 0) >= 70
      ? "text-red-400"
      : (trace.riskScore ?? 0) >= 40
        ? "text-orange-400"
        : "text-emerald-400";

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white ml-60 p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/evaluations/${evaluationId}`}
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Back to Evaluation
        </Link>

        <div className="mt-6 flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-500">EXECUTION TRACE</p>
            <h1 className="mt-2 font-mono text-2xl font-semibold">{scenarioId}</h1>
            <p className="mt-1 text-sm text-zinc-500">Evaluation: {evaluationId}</p>
          </div>

          <div className="flex items-center gap-3">
            {trace.riskScore !== undefined && (
              <div className="rounded-lg border border-zinc-800 bg-[#0d0d0d] px-4 py-2 text-center">
                <p className="text-xs text-zinc-500">Risk Score</p>
                <p className={`text-xl font-semibold ${riskColor}`}>{trace.riskScore}/100</p>
              </div>
            )}
            <span
              className={
                trace.status === "PASSED"
                  ? "rounded-full bg-emerald-950 px-3 py-1.5 text-xs text-emerald-400"
                  : "rounded-full bg-red-950 px-3 py-1.5 text-xs text-red-400"
              }
            >
              {trace.status}
            </span>
          </div>
        </div>

        {/* Scenario context */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {trace.userInput && (
            <div className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-5">
              <p className="text-xs text-zinc-500 mb-2">USER INPUT</p>
              <p className="text-sm text-zinc-200 leading-6">{trace.userInput}</p>
            </div>
          )}

          {(trace.scenarioCategory || trace.scenarioSeverity) && (
            <div className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-5">
              <p className="text-xs text-zinc-500 mb-2">SCENARIO CONTEXT</p>
              {trace.scenarioCategory && (
                <div className="mb-2">
                  <p className="text-xs text-zinc-600">Category</p>
                  <p className="text-sm text-zinc-300">
                    {trace.scenarioCategory.replaceAll("_", " ")}
                  </p>
                </div>
              )}
              {trace.scenarioSeverity && (
                <div>
                  <p className="text-xs text-zinc-600">Severity</p>
                  <p className={`text-sm font-medium ${
                    trace.scenarioSeverity === "CRITICAL" ? "text-red-400" :
                    trace.scenarioSeverity === "HIGH" ? "text-orange-400" :
                    trace.scenarioSeverity === "MEDIUM" ? "text-yellow-400" :
                    "text-zinc-300"
                  }`}>
                    {trace.scenarioSeverity}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tool call + mock result */}
        {trace.toolUsed && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-[#0d0d0d] p-5">
            <p className="text-xs text-zinc-500 mb-3">TOOL CALLED (MOCK SANDBOX)</p>
            <p className="font-mono text-sm text-emerald-400 mb-3">{trace.toolUsed}()</p>
            {trace.toolResult && (
              <>
                <p className="text-xs text-zinc-500 mb-2">Mock Environment Response</p>
                <pre className="rounded-lg bg-black p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
                  {trace.toolResult}
                </pre>
              </>
            )}
          </div>
        )}

        {/* Agent response */}
        {trace.agentResponse && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-[#0d0d0d] p-5">
            <p className="text-xs text-zinc-500 mb-2">AGENT RESPONSE</p>
            <p className="text-sm text-zinc-200 leading-6">{trace.agentResponse}</p>
          </div>
        )}

        {/* Policy evaluation result */}
        {trace.reason && (
          <div className={`mt-4 rounded-xl border p-5 ${
            trace.passed
              ? "border-emerald-900 bg-emerald-950/20"
              : "border-red-900 bg-red-950/20"
          }`}>
            <p className="text-xs text-zinc-500 mb-2">POLICY EVALUATION</p>
            <div className="flex items-start gap-3">
              <span className={`text-lg font-bold ${trace.passed ? "text-emerald-400" : "text-red-400"}`}>
                {trace.passed ? "✓" : "✗"}
              </span>
              <p className="text-sm leading-6 text-zinc-200">{trace.reason}</p>
            </div>
          </div>
        )}

        {/* Raw execution events */}
        <div className="mt-4 rounded-xl border border-zinc-800 bg-[#0d0d0d] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Execution Events</h2>
            <span className="text-xs text-zinc-500">{trace.events.length} events</span>
          </div>

          <div className="rounded-lg bg-black p-5 font-mono text-xs text-zinc-400">
            {trace.events.map((event, index) => (
              <div key={index} className="mb-1">
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
