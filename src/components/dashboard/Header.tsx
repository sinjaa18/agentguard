"use client";
import { Bell, Search, Play } from "lucide-react";
import Link from "next/link";
import UserMenu from "./UserMenu";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Header() {
  const { user } = useAuth();
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-[#0a0a0a] px-6">
      <div>
        <h1 className="text-sm font-medium">Overview</h1>
        <p className="text-xs text-zinc-500">AI agent reliability workspace</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:text-white">
          <Search size={15} />
          Search
        </button>

        <button className="rounded-lg border border-zinc-800 p-2 text-zinc-400 hover:text-white">
          <Bell size={16} />
        </button>

        <Link
          href="/evaluations"
          className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black"
        >
          <Play size={14} />
          Run Demo
        </Link>
        <UserMenu />
        {user && (
          <div className="hidden text-right md:block">
            <p className="text-xs text-zinc-500">Signed in as</p>

            <p className="text-sm">{user.email}</p>
          </div>
        )}
      </div>
    </header>
  );
}
