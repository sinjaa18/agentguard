"use client";

import { useEffect, useState } from "react";
import { Download, FileJson, RefreshCw } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AgentSelector from "@/components/agents/AgentSelector";
import {
  AgentDocument,
  FailureDocument,
  ScenarioDocument,
} from "@/types/database";
import { auth } from "@/lib/firebase/client";
import { getAgentScenarios } from "@/lib/firebase/scenarios";
import {
  getAgentFailures,
  getAgentEvaluations,
} from "@/lib/firebase/evaluations";
import { getAgentReport } from "@/lib/reports/getAgentReport";
import { ReliabilityReport } from "@/types/report";

type ReportData = {
  report: ReliabilityReport;
  failures: FailureDocument[];
  scenarios: ScenarioDocument[];
  evaluations: {
    id: string;
    total: number;
    passed: number;
    failed: number;
    status: string;
  }[];
};

export default function ReportsPage() {
  const [agent, setAgent] = useState<AgentDocument | null>(null);
  const [agentId, setAgentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    if (!agentId) {
      setData(null);
      return;
    }

    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setData(null);
        return;
      }

      setLoading(true);

      try {
        const [report, failures, scenarios, evaluations] = await Promise.all([
          getAgentReport(agentId, user.uid),
          getAgentFailures(agentId, user.uid),
          getAgentScenarios(agentId, user.uid),
          getAgentEvaluations(agentId, user.uid),
        ]);

        if (!report) {
          setData(null);
          return;
        }

        setData({
          report,
          failures,
          scenarios,
          evaluations: evaluations.map((evaluation) => ({
            id: evaluation.id,
            total: evaluation.total,
            passed: evaluation.passed,
            failed: evaluation.failed,
            status: evaluation.status,
          })),
        });
      } catch (error) {
        console.error("Failed to load report:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [agentId]);

  const regenerate = async () => {
    const user = auth.currentUser;

    if (!user || !agentId) return;

    setLoading(true);

    try {
      const [report, failures, scenarios, evaluations] = await Promise.all([
        getAgentReport(agentId, user.uid),
        getAgentFailures(agentId, user.uid),
        getAgentScenarios(agentId, user.uid),
        getAgentEvaluations(agentId, user.uid),
      ]);

      if (report) {
        setData({
          report,
          failures,
          scenarios,
          evaluations: evaluations.map((evaluation) => ({
            id: evaluation.id,
            total: evaluation.total,
            passed: evaluation.passed,
            failed: evaluation.failed,
            status: evaluation.status,
          })),
        });
      }
    } catch (error) {
      console.error("Failed to regenerate report:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportJSON = () => {
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${data.report.id}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#0a0a0a] text-white ml-64 p-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs text-zinc-500">RELIABILITY REPORT</p>

              <h1 className="mt-2 text-3xl font-semibold">
                Agent Reliability Report
              </h1>

              <p className="mt-2 text-sm text-zinc-500">
                Generate an engineering report from real evaluation data.
              </p>
            </div>

            {data && (
              <div className="flex gap-2">
                <button
                  onClick={regenerate}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg border border-zinc-800 px-4 py-2.5 text-sm disabled:opacity-40"
                >
                  <RefreshCw size={15} />
                  Regenerate
                </button>

                <button
                  onClick={exportJSON}
                  className="flex items-center gap-2 rounded-lg border border-zinc-800 px-4 py-2.5 text-sm"
                >
                  <FileJson size={15} />
                  Export JSON
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black"
                >
                  <Download size={15} />
                  Download Report
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 max-w-md">
            <p className="mb-2 text-xs text-zinc-500">SELECT AGENT</p>

            <AgentSelector
              value={agentId}
              onChange={(selected) => {
                setAgent(selected);
                setAgentId(selected.id);
              }}
            />
          </div>

          {!agent && (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-800 bg-[#0d0d0d] p-10 text-center">
              <p className="text-sm text-zinc-500">
                Select an agent to generate its reliability report.
              </p>
            </div>
          )}

          {agent && loading && (
            <div className="mt-8 rounded-xl border border-zinc-800 bg-[#0d0d0d] p-10 text-center">
              <p className="text-sm text-zinc-500">
                Generating reliability report...
              </p>
            </div>
          )}

          {agent && !loading && !data && (
            <div className="mt-8 rounded-xl border border-dashed border-zinc-800 bg-[#0d0d0d] p-10 text-center">
              <p className="text-sm text-zinc-500">
                No report data available yet.
              </p>

              <p className="mt-2 text-xs text-zinc-700">
                Run a completed evaluation for this agent first.
              </p>
            </div>
          )}

          {data && <ReportContent data={data} />}
        </div>
      </main>
    </ProtectedRoute>
  );
}

function ReportContent({ data }: { data: ReportData }) {
  const { report, failures, scenarios, evaluations } = data;

  return (
    <div className="mt-8 rounded-xl border border-zinc-800 bg-[#0d0d0d]">
      <div className="border-b border-zinc-800 p-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Info label="Agent" value={report.agentName} />

          <Info label="Version" value={`v${report.version}`} />

          <Info label="Report ID" value={report.id} />

          <Info label="Generated" value={formatDate(report.generatedAt)} />
        </div>
      </div>

      <div className="p-6">
        <Section title="Executive Summary">
          <p>{report.summary}</p>
        </Section>

        <Section title="Evaluation Summary">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Metric label="Evaluations" value={evaluations.length} />

            <Metric label="Scenarios" value={report.totalScenarios} />

            <Metric label="Passed" value={report.passed} />

            <Metric
              label="Failed"
              value={report.failed}
              danger={report.failed > 0}
            />
          </div>
        </Section>

        <Section title="Reliability Score">
          <div className="grid gap-4 md:grid-cols-2">
            <ScoreBox label="Overall Reliability" value={report.reliability} />

            <ScoreBox
              label="Security Score"
              value={report.security}
              danger={report.security < 70}
            />
          </div>
        </Section>

        <Section title="Failure Breakdown">
          {failures.length === 0 ? (
            <p className="text-sm text-zinc-600">No failures detected.</p>
          ) : (
            <div className="space-y-3">
              {failures.map((failure) => (
                <div
                  key={failure.id}
                  className="rounded-lg border border-zinc-800 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{failure.title}</p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {failure.category.replaceAll("_", " ")}
                        {" · "}
                        {failure.scenarioId}
                      </p>
                    </div>

                    <Severity severity={failure.severity} />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
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
          )}
        </Section>

        <Section title="Scenario Results">
          {scenarios.length === 0 ? (
            <p className="text-sm text-zinc-600">No scenarios found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-800 text-xs text-zinc-500">
                  <tr>
                    <th className="p-3 text-left">ID</th>
                    <th className="p-3 text-left">Scenario</th>
                    <th className="p-3 text-left">Category</th>
                    <th className="p-3 text-left">Severity</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {scenarios.map((scenario) => (
                    <tr key={scenario.id} className="border-t border-zinc-900">
                      <td className="p-3 font-mono text-xs text-zinc-500">
                        {scenario.id}
                      </td>

                      <td className="p-3">{scenario.title}</td>

                      <td className="p-3 text-xs text-zinc-500">
                        {scenario.category.replaceAll("_", " ")}
                      </td>

                      <td className="p-3 text-xs">{scenario.severity}</td>

                      <td
                        className={`p-3 text-xs ${
                          scenario.status === "PASSED"
                            ? "text-emerald-400"
                            : scenario.status === "FAILED"
                              ? "text-red-400"
                              : "text-zinc-500"
                        }`}
                      >
                        {scenario.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Evaluation History">
          {evaluations.length === 0 ? (
            <p className="text-sm text-zinc-600">
              No completed evaluations yet.
            </p>
          ) : (
            <div className="space-y-3">
              {evaluations.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="grid grid-cols-2 gap-4 rounded-lg border border-zinc-800 p-4 md:grid-cols-5"
                >
                  <Info label="Evaluation" value={evaluation.id} />

                  <Info label="Total" value={String(evaluation.total)} />

                  <Info label="Passed" value={String(evaluation.passed)} />

                  <Info label="Failed" value={String(evaluation.failed)} />

                  <Info label="Status" value={evaluation.status} />
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Recommendations">
          <div className="space-y-3">
            {report.recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="rounded-lg border border-zinc-800 p-4 text-sm text-zinc-300"
              >
                {index + 1}. {recommendation}
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-zinc-900 py-6 last:border-0">
      <h2 className="text-sm font-medium">{title}</h2>

      <div className="mt-4 text-sm text-zinc-400">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>

      <p className="mt-1 truncate text-sm">{value}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 p-4">
      <p className="text-xs text-zinc-500">{label}</p>

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

function ScoreBox({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 p-5">
      <p className="text-xs text-zinc-500">{label}</p>

      <p
        className={`mt-2 text-4xl font-semibold ${
          danger ? "text-red-400" : ""
        }`}
      >
        {value}
        <span className="ml-1 text-sm text-zinc-500">/ 100</span>
      </p>
    </div>
  );
}

function Severity({ severity }: { severity: string }) {
  const style =
    severity === "CRITICAL"
      ? "bg-red-950 text-red-400"
      : severity === "HIGH"
        ? "bg-orange-950 text-orange-400"
        : severity === "MEDIUM"
          ? "bg-yellow-950 text-yellow-400"
          : "bg-zinc-900 text-zinc-400";

  return (
    <span className={`rounded-full px-2 py-1 text-xs ${style}`}>
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

function formatDate(date: string) {
  return new Date(date).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}
