"use client";

import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/firebase/auth";

export default function UserMenu() {
  const router = useRouter();

  const logout = async () => {
    await logoutUser();
    router.push("/login");
  };

  return (
    <button
      onClick={logout}
      style={{
        padding: "6px 12px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "transparent",
        color: "var(--text-secondary)",
        fontSize: 12,
        cursor: "pointer",
        transition: "all 0.12s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)";
        (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
      }}
    >
      Sign out
    </button>
  );
}
