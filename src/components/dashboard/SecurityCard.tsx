"use client";

import { useEffect, useState } from "react";
import { AgentDocument } from "@/types/database";
import { getAgentScore } from "@/lib/scoring/getAgentScore";
import { auth } from "@/lib/firebase/client";

export default function SecurityCard({ agent }: { agent: AgentDocument }) {
  const [security, setSecurity] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const score = await getAgentScore(agent.id, user.uid);
        setSecurity(score.security);
      } catch { setSecurity(null); }
    };
    load();
  }, [agent.id]);

  if (security === null) {
    return (
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
        <div style={{ height: 16, width: 120, background: "var(--bg-raised)", borderRadius: 6, marginBottom: 12 }} />
        <div style={{ height: 48, width: 80, background: "var(--bg-raised)", borderRadius: 8 }} />
      </div>
    );
  }

  const critical = security < 70;
  const segments = 20;
  const filled = Math.round((security / 100) * segments);

  return (
    <div style={{
      background: critical ? "rgba(244,63,94,0.04)" : "var(--bg-surface)",
      border: `1px solid ${critical ? "var(--red-dim)" : "var(--border)"}`,
      borderRadius: 14,
      padding: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
            Security Score
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{
              fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1,
              color: critical ? "var(--red)" : "var(--green)",
            }}>
              {security}
            </span>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>/100</span>
          </div>
        </div>

        <span style={{
          padding: "4px 10px",
          borderRadius: 999,
          fontSize: 11, fontWeight: 600,
          background: critical ? "var(--red-dim)" : "var(--green-dim)",
          color: critical ? "var(--red)" : "var(--green)",
          border: `1px solid ${critical ? "var(--red-dim)" : "var(--green-dim)"}`,
          letterSpacing: "0.04em",
        }}>
          {critical ? "CRITICAL RISK" : "SECURE"}
        </span>
      </div>

      {/* Segmented bar */}
      <div>
        <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
          {[...Array(segments)].map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 6, borderRadius: 2,
              background: i < filled
                ? critical ? "var(--red)" : "var(--green)"
                : "var(--bg-raised)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Security posture</span>
          <span style={{ fontSize: 11, color: critical ? "var(--red)" : "var(--green)", fontWeight: 600 }}>{security}%</span>
        </div>
      </div>
    </div>
  );
}
