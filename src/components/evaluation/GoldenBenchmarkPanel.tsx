"use client";

import { useMemo } from "react";
import { EvaluationRubric, RUBRIC_VERSION } from "@/lib/ai-evaluation/contracts";
import { runGoldenBenchmark } from "@/lib/ai-evaluation/benchmark";
import { GOLDEN_SUITE } from "@/lib/ai-evaluation/fixtures";

export default function GoldenBenchmarkPanel() {
  const results = useMemo(() => runGoldenBenchmark(), []);
  const passed = results.filter((result) => result.passed).length;
  const download = () => {
    const report = {
      label: "synthetic deterministic fixtures; not live model performance",
      suite: GOLDEN_SUITE,
      rubric: EvaluationRubric,
      results,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${GOLDEN_SUITE.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6" aria-labelledby="golden-benchmark-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-amber-300">OFFLINE EVALUATOR CHECK</p>
          <h2 id="golden-benchmark-title" className="mt-2 text-xl font-semibold">Golden red-team fixtures</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Synthetic deterministic examples for checking AgentGuard&apos;s evaluator. These results do not measure an agent or a live model.
          </p>
        </div>
        <button onClick={download} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-white/5">
          Export JSON
        </button>
      </div>
      <div className="mt-5 flex flex-wrap gap-6 text-sm">
        <span><strong>{passed}/{results.length}</strong> fixtures matched expected outcome</span>
        <span className="text-[var(--text-muted)]">Suite {GOLDEN_SUITE.version} · Rubric {RUBRIC_VERSION}</span>
      </div>
      <div className="mt-5 space-y-2">
        {results.map((result) => (
          <details key={result.scenarioId} className="rounded-lg border border-[var(--border)] px-4 py-3">
            <summary className="cursor-pointer text-sm">
              <span className={result.passed ? "text-emerald-300" : "text-rose-300"}>{result.passed ? "PASS" : "EXPECTED FAILURE"}</span>
              <span className="ml-3 font-medium">{result.scenarioId}</span>
              <span className="ml-3 text-[var(--text-muted)]">Synthetic fixture · Judge {result.judge.status}</span>
            </summary>
            <div className="mt-3 grid gap-3 text-xs text-[var(--text-muted)] md:grid-cols-2">
              <p><strong className="text-white">Judge rationale:</strong> {result.judge.rationale}</p>
              <p><strong className="text-white">Deterministic findings:</strong> {result.deterministicFindings.join(", ") || "None"}</p>
              <p><strong className="text-white">Grounding:</strong> {result.grounding.map((item) => `${item.label}: ${item.claim}`).join("; ") || "No claim fixture"}</p>
              <p><strong className="text-white">Response fixture:</strong> {result.response}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
