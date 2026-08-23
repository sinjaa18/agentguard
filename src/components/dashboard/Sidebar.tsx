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
} from "lucide-react";

const items = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "Test Suites", href: "/test-suites", icon: FlaskConical },
  { name: "Evaluations", href: "/evaluations", icon: PlayCircle },
  { name: "Failures", href: "/failures", icon: ShieldAlert },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Versions", href: "/versions", icon: GitBranch },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Scenarios", href: "/scenarios", icon: FlaskConical },
  { name: "Regression", href: "/regression", icon: GitCompare },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-zinc-800 bg-[#0c0c0c]">
      <div className="border-b border-zinc-800 px-6 py-5">
        <div className="text-lg font-semibold tracking-tight">AgentGuard</div>
        <div className="mt-1 text-xs text-zinc-500">AI Agent Reliability</div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon size={17} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="text-xs text-zinc-500">Environment</div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Demo Mode
          </div>
        </div>
      </div>
    </aside>
  );
}
