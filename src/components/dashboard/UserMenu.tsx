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
      className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:text-white"
    >
      Sign Out
    </button>
  );
}
