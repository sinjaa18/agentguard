"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[var(--bg-base)] text-white ml-60 p-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs text-[var(--text-muted)]">SETTINGS</p>
          <h1 className="mt-2 text-3xl font-semibold">Settings</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Workspace configuration and environment settings.
          </p>

          <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
            <h2 className="font-medium">Environment</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              AgentGuard is running in <span className="text-white">Demo / Sandbox mode</span>.
              All tool calls are mocked — the real world is never touched during evaluation.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
            <h2 className="font-medium">AI Model</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Scenario generation and agent simulation use <span className="text-white">Google Gemini</span> via a secure server-side API route.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
            <h2 className="font-medium">Data Storage</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              All evaluation data is stored in <span className="text-white">Cloud Firestore</span> and scoped to your authenticated user account.
            </p>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
