"use client";

import { useState } from "react";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function FirebaseTestPage() {
  const [status, setStatus] = useState("Not tested");

  const testFirestore = async () => {
    try {
      setStatus("Writing...");

      await addDoc(collection(db, "firebaseTest"), {
        message: "AgentGuard Firebase test",
        createdAt: new Date().toISOString(),
      });

      const snapshot = await getDocs(collection(db, "firebaseTest"));

      setStatus(`Success — ${snapshot.size} document(s) found`);
    } catch (error) {
      console.error(error);
      setStatus("FAILED — check browser console");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-white p-10">
      <h1 className="text-3xl font-semibold">Firebase Test</h1>

      <button
        onClick={testFirestore}
        className="mt-8 rounded-lg bg-white px-5 py-3 text-sm font-medium text-black"
      >
        Test Firestore
      </button>

      <p className="mt-5 text-[var(--text-secondary)]">{status}</p>
    </main>
  );
}
