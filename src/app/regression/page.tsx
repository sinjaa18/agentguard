"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AgentSelector from "@/components/agents/AgentSelector";
import {
  AgentDocument,
  EvaluationDocument,
  FailureDocument,
} from "@/types/database";
import {
  getAgentEvaluations,
  getAgentFailures,
} from "@/lib/firebase/evaluations";
import { auth } from "@/lib/firebase/client";
import {
  compareEvaluations,
  RegressionResult,
} from "@/lib/regression/compareEvaluations";

export default function RegressionPage() {
  const [agent, setAgent] = useState<AgentDocument | null>(null);
  const [agentId, setAgentId] = useState("");
  const [evaluations, setEvaluations] = useState<EvaluationDocument[]>([]);
  const [previousId, setPreviousId] = useState("");
  const [currentId, setCurrentId] = useState("");
  const [result, setResult] = useState<RegressionResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentId) {
      setEvaluations([]);
      setPreviousId("");
      setCurrentId("");
      setResult(null);
      return;
    }

    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setEvaluations([]);
        return;
      }

      setLoading(true);

      try {
        const data = await getAgentEvaluations(agentId, user.uid);

        const completed = data.filter(
          (evaluation) => evaluation.status === "COMPLETED",
        );

        setEvaluations(completed);

        if (completed.length >= 2) {
          setPreviousId(completed[completed.length - 2].id);
          setCurrentId(completed[completed.length - 1].id);
        } else {
          setPreviousId("");
          setCurrentId("");
        }

        setResult(null);
      } catch (error) {
        console.error("Failed to load evaluations:", error);
        setEvaluations([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [agentId]);

  const runComparison = async () => {
    if (!agentId || !previousId || !currentId || previousId === currentId) {
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("Please sign in first.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const previous = evaluations.find(
        (evaluation) => evaluation.id === previousId,
      );

      const current = evaluations.find(
        (evaluation) => evaluation.id === currentId,
      );

      if (!previous || !current) {
        throw new Error("Selected evaluations could not be found.");
      }

      const failures = await getAgentFailures(agentId, user.uid);

      const previousFailures = failures.filter(
        (failure) => failure.evaluationId === previous.id,
      );

      const currentFailures = failures.filter(
        (failure) => failure.evaluationId === current.id,
      );

      const comparison = compareEvaluations(
        previous,
        current,
        previousFailures,
        currentFailures,
      );

      setResult(comparison);
    } catch (error) {
      console.error("Regression comparison failed:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Regression comparison failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[var(--bg-base)] text-white ml-60 p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs text-[var(--text-muted)]">REGRESSION TESTING</p>

          <h1 className="mt-2 text-3xl font-semibold">Regression Analysis</h1>

          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Compare two completed evaluations for the selected agent.
          </p>

          <div className="mt-6 max-w-md">
            <p className="mb-2 text-xs text-[var(--text-muted)]">SELECT AGENT</p>

            <AgentSelector
              value={agentId}
              onChange={(selected) => {
                setAgent(selected);
                setAgentId(selected.id);
                setResult(null);
              }}
            />
          </div>

          {!agent && (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Select an agent to begin regression analysis.
              </p>
            </div>
          )}

          {agent && (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Selector
                  label="Previous Evaluation"
                  value={previousId}
                  evaluations={evaluations}
                  onChange={setPreviousId}
                />

                <Selector
                  label="Current Evaluation"
                  value={currentId}
                  evaluations={evaluations}
                  onChange={setCurrentId}
                />
              </div>

              <button
                onClick={runComparison}
                disabled={
                  loading ||
                  !previousId ||
                  !currentId ||
                  previousId === currentId
                }
                className="mt-5 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black disabled:opacity-40"
              >
                {loading ? "Comparing..." : "Run Regression Test"}
              </button>

              {evaluations.length < 2 && (
                <p className="mt-4 text-sm text-[var(--text-dim)]">
                  Run at least two completed evaluations to compare versions.
                </p>
              )}

              {result && (
                <div className="mt-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Metric
                      label="Previous"
                      value={`${result.previousReliability}%`}
                    />

                    <Metric
                      label="Current"
                      value={`${result.currentReliability}%`}
                    />

                    <Metric
                      label="Reliability Δ"
                      value={`${
                        result.reliabilityDelta > 0 ? "+" : ""
                      }${result.reliabilityDelta}%`}
                    />

                    <Metric
                      label="New Failures"
                      value={result.newFailures.length}
                      danger={result.newFailures.length > 0}
                    />
                  </div>

                  <div
                    className={`rounded-xl border p-6 ${
                      result.status === "REGRESSION"
                        ? "border-red-900 bg-red-950/20"
                        : result.status === "IMPROVED"
                          ? "border-emerald-900 bg-emerald-950/20"
                          : "border-[var(--border)] bg-[var(--bg-surface)]"
                    }`}
                  >
                    <p className="text-xs text-[var(--text-muted)]">RESULT</p>

                    <p
                      className={`mt-2 text-2xl font-semibold ${
                        result.status === "REGRESSION"
                          ? "text-red-400"
                          : result.status === "IMPROVED"
                            ? "text-emerald-400"
                            : "text-white"
                      }`}
                    >
                      {result.status}
                    </p>
                  </div>

                  <FailureList
                    title="New Failures"
                    failures={result.newFailures}
                    empty="No new failures detected."
                  />

                  <FailureList
                    title="Resolved Failures"
                    failures={result.resolvedFailures}
                    empty="No previously failing scenarios were resolved."
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}

function Selector({
  label,
  value,
  evaluations,
  onChange,
}: {
  label: string;
  value: string;
  evaluations: EvaluationDocument[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs text-[var(--text-muted)]">{label}</p>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm outline-none"
      >
        <option value="">Select evaluation</option>

        {evaluations.map((evaluation) => (
          <option key={evaluation.id} value={evaluation.id}>
            {evaluation.id} — {evaluation.passed}/{evaluation.total} passed
          </option>
        ))}
      </select>
    </div>
  );
}

function Metric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>

      <p
        className={`mt-2 text-2xl font-semibold ${
          danger ? "text-red-400" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FailureList({
  title,
  failures,
  empty,
}: {
  title: string;
  failures: FailureDocument[];
  empty: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="border-b border-[var(--border)] p-5">
        <h2 className="font-medium">{title}</h2>
      </div>

      {failures.length === 0 ? (
        <p className="p-6 text-sm text-[var(--text-dim)]">{empty}</p>
      ) : (
        <div className="divide-y divide-zinc-900">
          {failures.map((failure) => (
            <div key={failure.id} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{failure.title}</p>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {failure.category.replaceAll("_", " ")}
                    {" · "}
                    {failure.scenarioId}
                  </p>
                </div>

                <span
                  className={
                    failure.severity === "CRITICAL"
                      ? "text-xs text-red-400"
                      : failure.severity === "HIGH"
                        ? "text-xs text-orange-400"
                        : "text-xs text-[var(--text-secondary)]"
                  }
                >
                  {failure.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
