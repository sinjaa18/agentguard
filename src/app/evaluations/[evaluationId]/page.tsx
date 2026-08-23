"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getEvaluation,
  getEvaluationFailures,
  getEvaluationTraces,
} from "@/lib/firebase/evaluations";
import { auth } from "@/lib/firebase/client";
import {
  EvaluationDocument,
  ExecutionTraceDocument,
  FailureDocument,
} from "@/types/database";

export default function EvaluationDetailsPage() {
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationDocument | null>(null);
  const [traces, setTraces] = useState<ExecutionTraceDocument[]>([]);
  const [failures, setFailures] = useState<FailureDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const path = window.location.pathname.split("/");
      const id = path[2];

      if (!id) {
        setLoading(false);
        return;
      }

      setEvaluationId(id);

      const user = auth.currentUser;

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const result = await getEvaluation(id, user.uid);

        if (!result) {
          setLoading(false);
          return;
        }

        setEvaluation(result);

        const [traceData, failureData] = await Promise.all([
          getEvaluationTraces(id, user.uid),
          getEvaluationFailures(id, user.uid),
        ]);

        setTraces(traceData);
        setFailures(failureData);
      } catch (error) {
        console.error("Failed to load evaluation:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white ml-64 p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-zinc-500">Loading evaluation...</p>
        </div>
      </main>
    );
  }

  if (!evaluation || !evaluationId) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white ml-64 p-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/evaluations"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Back to Evaluations
        </Link>

        <div className="mt-6">
          <p className="text-xs text-zinc-500">EVALUATION</p>

          <h1 className="mt-2 font-mono text-2xl font-semibold">
            {evaluation.id}
          </h1>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Scenarios" value={evaluation.total} />

          <Stat label="Passed" value={evaluation.passed} />

          <Stat label="Failed" value={evaluation.failed} />

          <Stat label="Status" value={evaluation.status} />
        </div>

        <section className="mt-8 overflow-hidden rounded-xl border border-zinc-800 bg-[#0d0d0d]">
          <div className="border-b border-zinc-800 p-5">
            <h2 className="font-medium">Execution Traces</h2>

            <p className="mt-1 text-xs text-zinc-500">Stored execution data</p>
          </div>

          <div className="divide-y divide-zinc-900">
            {traces.length === 0 && (
              <div className="p-8 text-sm text-zinc-600">No traces found.</div>
            )}

            {traces.map((trace) => (
              <div key={trace.id} className="p-5">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/evaluations/${evaluationId}/traces/${trace.scenarioId}`}
                    className="font-mono text-sm hover:underline"
                  >
                    {trace.scenarioId}
                  </Link>

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

                <div className="mt-4 rounded-lg bg-black p-4 font-mono text-xs text-zinc-400">
                  {trace.events.map((event, index) => (
                    <div key={index}>
                      <span className="text-zinc-600">[{event.time}]</span>{" "}
                      {event.message}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-xl border border-zinc-800 bg-[#0d0d0d]">
          <div className="border-b border-zinc-800 p-5">
            <h2 className="font-medium">Failures</h2>

            <p className="mt-1 text-xs text-zinc-500">
              Findings detected during this evaluation
            </p>
          </div>

          <div className="divide-y divide-zinc-900">
            {failures.length === 0 && (
              <div className="p-8 text-sm text-zinc-600">
                No failures detected.
              </div>
            )}

            {failures.map((failure) => (
              <div key={failure.id} className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{failure.title}</p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {failure.category.replaceAll("_", " ")}
                      {" · "}
                      {failure.scenarioId}
                    </p>
                  </div>

                  <Severity severity={failure.severity} />
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <Field
                    title="Observed Behavior"
                    value={failure.observedBehavior}
                  />

                  <Field
                    title="Expected Behavior"
                    value={failure.expectedBehavior}
                  />

                  <Field title="Risk" value={failure.risk} />

                  <Field title="Root Cause" value={failure.rootCause} />

                  <div className="md:col-span-2">
                    <Field
                      title="Recommended Fix"
                      value={failure.recommendedFix}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-5">
      <p className="text-xs text-zinc-500">{label}</p>

      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Severity({ severity }: { severity: string }) {
  const color =
    severity === "CRITICAL"
      ? "bg-red-950 text-red-400"
      : severity === "HIGH"
        ? "bg-orange-950 text-orange-400"
        : severity === "MEDIUM"
          ? "bg-yellow-950 text-yellow-400"
          : "bg-zinc-900 text-zinc-400";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs ${color}`}>
      {severity}
    </span>
  );
}

function Field({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{title}</p>

      <p className="mt-2 text-sm leading-6 text-zinc-300">{value}</p>
    </div>
  );
}
