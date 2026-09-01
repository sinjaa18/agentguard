"use client";

import { useEffect, useState } from "react";
import { AgentDocument } from "@/types/database";
import { auth } from "@/lib/firebase/client";
import { getDashboardData } from "@/lib/dashboard/getDashboardData";

export default function KpiCards({ agent }: { agent: AgentDocument }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboardData>> | null>(null);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        setData(await getDashboardData(agent.id, user.uid));
      } catch { setData(null); }
    };
    load();
  }, [agent.id]);

  if (!data) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ height: 88, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Evaluations",    value: data.evaluations,      sub: "total runs" },
    { label: "Scenarios",      value: data.scenarios,         sub: "test cases" },
    { label: "Failures",       value: data.failures,          sub: "detected",   warn: data.failures > 0 },
    { label: "Critical",       value: data.criticalFailures,  sub: "high severity", danger: data.criticalFailures > 0 },
    { label: "Reliability",    value: `${data.averageReliability}%`, sub: "avg score" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
      {cards.map(({ label, value, sub, warn, danger }) => (
        <div key={label} style={{
          background: danger ? "rgba(244,63,94,0.04)" : "var(--bg-surface)",
          border: `1px solid ${danger ? "var(--red-dim)" : warn ? "var(--border-mid)" : "var(--border)"}`,
          borderRadius: 12,
          padding: "16px 18px",
          position: "relative",
        }}>
          {danger && (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 2,
              background: "var(--red)", borderRadius: "12px 12px 0 0",
            }} />
          )}
          <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
            {label}
          </p>
          <p style={{
            fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 4,
            color: danger ? "var(--red)" : warn ? "var(--yellow)" : "var(--text-primary)",
          }}>
            {value}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}
