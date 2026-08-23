"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser, registerUser } from "@/lib/firebase/auth";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");

    if (!email || !password) {
      setError("Enter email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      if (mode === "login") {
        await loginUser(email, password);
      } else {
        await registerUser(email, password);
      }

      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);

      switch (error?.code) {
        case "auth/invalid-credential":
          setError("Invalid email or password.");
          break;

        case "auth/email-already-in-use":
          setError("An account with this email already exists.");
          break;

        case "auth/weak-password":
          setError("Password is too weak.");
          break;

        case "auth/invalid-email":
          setError("Enter a valid email address.");
          break;

        default:
          setError("Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-zinc-500 hover:text-white">
          ← AgentGuard
        </Link>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-8">
          <div>
            <p className="text-xs text-zinc-500">
              AI AGENT RELIABILITY PLATFORM
            </p>

            <h1 className="mt-3 text-2xl font-semibold">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              {mode === "login"
                ? "Sign in to your AgentGuard workspace."
                : "Start testing your AI agents."}
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-xs text-zinc-500">Email</label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm outline-none focus:border-zinc-600"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-zinc-500">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm outline-none focus:border-zinc-600"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={loading}
              className="w-full rounded-lg bg-white py-3 text-sm font-medium text-black disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-zinc-500">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="ml-2 text-white hover:underline"
            >
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
