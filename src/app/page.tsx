import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-sm text-zinc-500 mb-4">
          AI Agent Reliability Platform
        </p>
        <h1 className="text-5xl font-semibold tracking-tight">
          Test Your AI Agents
          <br />
          Before Your Users Do.
        </h1>
        <p className="text-zinc-400 max-w-xl mx-auto mt-6">
          Stress-test AI agents against prompt injection, tool misuse, unsafe
          actions and real-world failure modes.
        </p>

        <div className="flex gap-3 justify-center mt-8">
          <Link
            href="/dashboard"
            className="px-5 py-3 rounded-lg bg-white text-black font-medium"
          >
            Try Live Demo
          </Link>

          <a
            href="https://github.com"
            className="px-5 py-3 rounded-lg border border-zinc-800"
          >
            View GitHub
          </a>
        </div>
      </div>
    </main>
  );
}
