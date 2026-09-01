"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  FlaskConical,
  PlayCircle,
  ShieldAlert,
  FileText,
  GitBranch,
  Settings,
  GitCompare,
  Activity,
} from "lucide-react";

const nav = [
  { label: "Overview",   href: "/dashboard",   icon: LayoutDashboard },
  { label: "Agents",     href: "/agents",       icon: Bot },
  { label: "Scenarios",  href: "/scenarios",    icon: FlaskConical },
  { label: "Test Suite", href: "/test-suites",  icon: Activity },
  { label: "Evaluations",href: "/evaluations",  icon: PlayCircle },
  { label: "Failures",   href: "/failures",     icon: ShieldAlert },
  { label: "Reports",    href: "/reports",      icon: FileText },
  { label: "Versions",   href: "/versions",     icon: GitBranch },
  { label: "Regression", href: "/regression",   icon: GitCompare },
  { label: "Settings",   href: "/settings",     icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border)" }}
      className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col"
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5">
          {/* Shield icon mark */}
          <div
            style={{
              width: 28, height: 28,
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 12px rgba(99,102,241,0.4)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L2 3.5V8c0 3.5 2.5 5.8 6 7 3.5-1.2 6-3.5 6-7V3.5L8 1z"
                fill="white" fillOpacity="0.95"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
              AgentGuard
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Reliability Engine
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 10px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                background: active ? "var(--bg-overlay)" : "transparent",
                borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                transition: "all 0.12s",
                textDecoration: "none",
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-raised)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                }
              }}
            >
              <Icon size={15} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer status */}
      <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
        <div style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "10px 12px",
        }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
            Sandbox Environment
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
            <span className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
            Mock Mode Active
          </div>
        </div>
      </div>
    </aside>
  );
}
