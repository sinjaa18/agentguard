"use client";

import { useEffect, useState } from "react";
import { AgentDocument } from "@/types/database";
import { auth } from "@/lib/firebase/client";
import { getAgentScore } from "@/lib/scoring/getAgentScore";

export default function Scorecard({ agent }: { agent: AgentDocument }) {
  const [score, setScore] = useState<Awaited<ReturnType<typeof getAgentScore>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) { setLoading(false); return; }
      setLoading(true);
      try {
        setScore(await getAgentScore(agent.id, user.uid));
      } catch { setScore(null); }
      finally { setLoading(false); }
    };
    load();
  }, [agent.id]);

  const metrics = score ? [
    { label: "Task Success",          value: score.taskSuccess },
    { label: "Tool Safety",           value: score.toolSafety },
    { label: "Instruction Following", value: score.instructionFollowing },
    { label: "Adversarial Robustness",value: score.adversarialRobustness },
    { label: "Hallucination Resistance",value: score.hallucinationResistance },
    { label: "Goal Stability",        value: score.goalStability },
  ] : [];

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
            Reliability Score
          </p>
          {loading || !score ? (
            <div style={{ width: 60, height: 52, background: "var(--bg-raised)", borderRadius: 8 }} />
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{
                fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1,
                background: score.overall >= 80
                  ? "linear-gradient(135deg, #10b981, #6ee7b7)"
                  : score.overall >= 60
                  ? "linear-gradient(135deg, #eab308, #fde68a)"
                  : "linear-gradient(135deg, #f43f5e, #fda4af)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {score.overall}
              </span>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>/100</span>
            </div>
          )}
          {score && (
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{getGrade(score.overall)}</p>
          )}
        </div>

        {score && (
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>Security</p>
            <span style={{
              fontSize: 22, fontWeight: 700,
              color: score.security >= 70 ? "var(--green)" : "var(--red)",
            }}>
              {score.security}
            </span>
            <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
              {score.criticalFailures > 0 ? `${score.criticalFailures} critical` : "No critical"}
            </p>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 28, background: "var(--bg-raised)", borderRadius: 6 }} />
          ))}
        </div>
      )}

      {!loading && score && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {metrics.map(({ label, value }) => (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: value >= 80 ? "var(--green)" : value >= 60 ? "var(--yellow)" : "var(--red)",
                }}>{value}%</span>
              </div>
              <div style={{ height: 3, background: "var(--bg-raised)", borderRadius: 99 }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  width: `${value}%`,
                  background: value >= 80
                    ? "linear-gradient(90deg, #10b981, #6ee7b7)"
                    : value >= 60
                    ? "linear-gradient(90deg, #eab308, #fde68a)"
                    : "linear-gradient(90deg, #f43f5e, #fda4af)",
                  transition: "width 0.6s ease",
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getGrade(s: number) {
  if (s >= 95) return "Grade A+";
  if (s >= 90) return "Grade A";
  if (s >= 85) return "Grade A-";
  if (s >= 80) return "Grade B+";
  if (s >= 75) return "Grade B";
  if (s >= 70) return "Grade B-";
  if (s >= 60) return "Grade C";
  return "Grade D";
}
