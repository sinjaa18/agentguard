"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AgentDocument } from "@/types/database";
import { getAgentEvaluations } from "@/lib/firebase/evaluations";
import { auth } from "@/lib/firebase/client";

type EvalRow = { id: string; total: number; passed: number; failed: number; status: string };

export default function RecentEvaluations({ agent }: { agent: AgentDocument }) {
  const [rows, setRows] = useState<EvalRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const data = await getAgentEvaluations(agent.id, user.uid);
        setRows(data.slice(-6).reverse().map(e => ({
          id: e.id, total: e.total, passed: e.passed, failed: e.failed, status: e.status,
        })));
      } catch { setRows([]); }
    };
    load();
  }, [agent.id]);

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{
        padding: "18px 22px",
        borderBottom: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Recent Evaluations</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Latest runs for {agent.name}</p>
        </div>
        <Link href="/evaluations" style={{
          fontSize: 11, color: "var(--accent)", textDecoration: "none", fontWeight: 500,
        }}>View all →</Link>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          No evaluations yet.
        </div>
      ) : (
        <div>
          {rows.map((row, i) => {
            const reliability = row.total ? Math.round((row.passed / row.total) * 100) : 0;
            return (
              <Link key={row.id} href={`/evaluations/${row.id}`} style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 22px",
                borderTop: i > 0 ? "1px solid var(--border)" : "none",
                textDecoration: "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-raised)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.id}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {row.passed} passed · {row.failed} failed · {row.total} total
                  </p>
                </div>

                {/* Reliability mini-bar */}
                <div style={{ width: 80, marginRight: 16 }}>
                  <div style={{ height: 3, background: "var(--bg-raised)", borderRadius: 99 }}>
                    <div style={{
                      height: "100%", borderRadius: 99, width: `${reliability}%`,
                      background: reliability >= 80 ? "var(--green)" : reliability >= 60 ? "var(--yellow)" : "var(--red)",
                    }} />
                  </div>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, textAlign: "right" }}>{reliability}%</p>
                </div>

                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
                  padding: "3px 8px", borderRadius: 999,
                  ...(row.status === "COMPLETED"
                    ? { background: "var(--green-dim)", color: "var(--green)" }
                    : { background: "var(--bg-raised)", color: "var(--text-secondary)" }),
                }}>
                  {row.status}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
