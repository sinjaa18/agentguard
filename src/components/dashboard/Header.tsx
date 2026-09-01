"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import UserMenu from "./UserMenu";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Header() {
  const { user } = useAuth();

  return (
    <header
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--accent)",
          boxShadow: "0 0 8px var(--accent)",
        }} />
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 400 }}>
          AI Agent Reliability Workspace
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {user && (
          <span style={{
            fontSize: 12,
            color: "var(--text-muted)",
            maxWidth: 180,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {user.email}
          </span>
        )}

        <Link
          href="/evaluations"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 8,
            background: "var(--accent)",
            color: "white",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 0 14px var(--accent-glow)",
            letterSpacing: "0.01em",
          }}
        >
          <Play size={12} strokeWidth={2.5} />
          Run Evaluation
        </Link>

        <UserMenu />
      </div>
    </header>
  );
}
