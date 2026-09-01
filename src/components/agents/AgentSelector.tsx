"use client";

import { useEffect, useRef, useState } from "react";
import { AgentDocument } from "@/types/database";
import { auth } from "@/lib/firebase/client";
import { getUserAgents } from "@/lib/firebase/agents";

type Props = {
  value: string;
  onChange: (agent: AgentDocument) => void;
  preselect?: string;
};

export default function AgentSelector({ value, onChange, preselect }: Props) {
  const [agents, setAgents] = useState<AgentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const calledRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const data = await getUserAgents(user.uid);
        setAgents(data);

        if (!calledRef.current) {
          calledRef.current = true;
          // Prefer preselect, then value, then first agent
          const target = preselect || value;
          const match = target ? data.find((a) => a.id === target) : null;
          if (match) {
            onChange(match);
          } else if (data.length > 0 && !value) {
            onChange(data[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load agents:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-[#0d0d0d] px-4 py-3 text-sm text-zinc-500">
        Loading agents...
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        const agent = agents.find((item) => item.id === e.target.value);
        if (agent) onChange(agent);
      }}
      className="w-full rounded-lg border border-zinc-800 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-zinc-600"
    >
      {!agents.length && <option value="">No agents available</option>}

      {agents.map((agent) => (
        <option key={agent.id} value={agent.id}>
          {agent.name}
        </option>
      ))}
    </select>
  );
}
