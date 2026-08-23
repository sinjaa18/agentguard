"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { AlertTriangle, Check } from "lucide-react";
import { RiskLevel, Tool } from "@/types/agent";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {createAgentDocument} from "@/lib/firebase/agents";

const toolTemplates: Tool[] = [
  {
    id: "get_order",
    name: "get_order",
    description: "Retrieve order information.",
    parameters: ["order_id"],
    risk: "LOW",
  },
  {
    id: "issue_refund",
    name: "issue_refund",
    description: "Issue a customer refund.",
    parameters: ["order_id", "amount"],
    risk: "CRITICAL",
  },
  {
    id: "cancel_order",
    name: "cancel_order",
    description: "Cancel an existing order.",
    parameters: ["order_id"],
    risk: "HIGH",
  },
  {
    id: "send_email",
    name: "send_email",
    description: "Send an email to a customer.",
    parameters: ["to", "subject", "body"],
    risk: "MEDIUM",
  },
];

const capabilityList = [
  "Read data",
  "Modify data",
  "Send messages",
  "Financial actions",
  "Delete data",
  "External API calls",
];

export default function NewAgentPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("Gemini");
  const [tools, setTools] = useState<Tool[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const dangerousCapabilities =
    capabilities.includes("Financial actions") ||
    capabilities.includes("Delete data");

  const toggleTool = (tool: Tool) => {
    setTools((current) =>
      current.some((t) => t.id === tool.id)
        ? current.filter((t) => t.id !== tool.id)
        : [...current, tool],
    );
  };

  const toggleCapability = (capability: string) => {
    setCapabilities((current) =>
      current.includes(capability)
        ? current.filter((c) => c !== capability)
        : [...current, capability],
    );
  };

  const createAgent = async () => {
    if (!name.trim()) return;

    const user = auth.currentUser;

    if (!user) {
      alert("Please sign in before creating an agent.");
      return;
    }

    try {
      setLoading(true);

      await createAgentDocument({
        ownerId: user.uid,
        name,
        description,
        systemPrompt,
        model,
        mode: "MOCK",
        version: "1.0",
        capabilities,
        tools,
      });

      localStorage.removeItem("agentguard_new_agent");
      router.push("/agents");
    } catch (error) {
      console.error("Failed to create agent:", error);
      alert("Could not create agent.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>

    <main className="min-h-screen bg-[#0a0a0a] text-white ml-64 p-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs text-zinc-500">AGENTS / NEW</p>

        <h1 className="mt-2 text-3xl font-semibold">Create Agent</h1>

        <p className="mt-2 text-sm text-zinc-500">
          Configure an AI agent before running reliability tests.
        </p>

        <div className="mt-8 flex items-center">
          {[1, 2, 3, 4].map((number, index) => (
            <div key={number} className="flex flex-1 items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                  step >= number
                    ? "bg-white text-black"
                    : "border border-zinc-800 text-zinc-500"
                }`}
              >
                {step > number ? <Check size={14} /> : number}
              </div>

              {index < 3 && (
                <div
                  className={`mx-3 h-px flex-1 ${
                    step > number ? "bg-white" : "bg-zinc-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-zinc-800 bg-[#0d0d0d] p-6">
          {step === 1 && (
            <BasicInfo
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              systemPrompt={systemPrompt}
              setSystemPrompt={setSystemPrompt}
            />
          )}

          {step === 2 && <ModelStep model={model} setModel={setModel} />}

          {step === 3 && <ToolsStep tools={tools} toggleTool={toggleTool} />}

          {step === 4 && (
            <CapabilitiesStep
              capabilities={capabilities}
              toggleCapability={toggleCapability}
              dangerous={dangerousCapabilities}
            />
          )}

          <div className="mt-8 flex justify-between border-t border-zinc-800 pt-5">
            <button
              onClick={() => {
                if (step === 1) {
                  router.push("/agents");
                } else {
                  setStep(step - 1);
                }
              }}
              className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm"
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !name.trim()}
                className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
              onClick={createAgent}
              disabled={!name.trim()}
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black disabled:opacity-40"
              >
                Create Agent
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
</ProtectedRoute>
  );
}

function BasicInfo({
  name,
  setName,
  description,
  setDescription,
  systemPrompt,
  setSystemPrompt,
}: {
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-medium">Basic Information</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Define what this agent is responsible for.
      </p>

      <div className="mt-6 space-y-5">
        <Field label="Agent Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Customer Support Refund Agent"
            className="input"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Handles customer refunds and support requests."
            className="input resize-none"
          />
        </Field>

        <Field label="System Prompt">
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={7}
            placeholder="You are a customer support agent..."
            className="input resize-none font-mono text-xs"
          />
        </Field>
      </div>
    </div>
  );
}

function ModelStep({
  model,
  setModel,
}: {
  model: string;
  setModel: (value: string) => void;
}) {
  const models = ["Gemini", "OpenAI", "Anthropic", "Custom"];

  return (
    <div>
      <h2 className="text-lg font-medium">Model</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Select the model powering this agent.
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {models.map((item) => (
          <button
            key={item}
            onClick={() => setModel(item)}
            className={`rounded-xl border p-5 text-left ${
              model === item
                ? "border-white bg-zinc-900"
                : "border-zinc-800 hover:bg-zinc-900"
            }`}
          >
            <p className="font-medium">{item}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {item === "Gemini"
                ? "Recommended for this prototype"
                : "Connect this provider later"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ToolsStep({
  tools,
  toggleTool,
}: {
  tools: Tool[];
  toggleTool: (tool: Tool) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-medium">Tools</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Select the tools available to your agent.
      </p>

      <div className="mt-6 space-y-3">
        {toolTemplates.map((tool) => {
          const selected = tools.some((t) => t.id === tool.id);

          return (
            <button
              key={tool.id}
              onClick={() => toggleTool(tool)}
              className={`w-full rounded-xl border p-4 text-left ${
                selected ? "border-white bg-zinc-900" : "border-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm">{tool.name}</p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {tool.description}
                  </p>
                </div>

                <RiskBadge risk={tool.risk} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CapabilitiesStep({
  capabilities,
  toggleCapability,
  dangerous,
}: {
  capabilities: string[];
  toggleCapability: (value: string) => void;
  dangerous: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-medium">Capabilities</h2>

      <p className="mt-1 text-sm text-zinc-500">
        Define what the agent is allowed to do.
      </p>

      <div className="mt-6 space-y-3">
        {capabilityList.map((capability) => {
          const selected = capabilities.includes(capability);

          return (
            <button
              key={capability}
              onClick={() => toggleCapability(capability)}
              className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${
                selected ? "border-white bg-zinc-900" : "border-zinc-800"
              }`}
            >
              <span className="text-sm">{capability}</span>

              <span
                className={`h-4 w-4 rounded border ${
                  selected ? "border-white bg-white" : "border-zinc-700"
                }`}
              />
            </button>
          );
        })}
      </div>

      {dangerous && (
        <div className="mt-6 flex gap-3 rounded-xl border border-red-900 bg-red-950/20 p-4">
          <AlertTriangle size={18} className="mt-0.5 text-red-400" />

          <div>
            <p className="text-sm font-medium text-red-400">
              Dangerous capability enabled
            </p>

            <p className="mt-1 text-xs leading-5 text-zinc-400">
              This agent can perform potentially destructive or financial
              actions. These actions will remain mocked during evaluation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const style =
    risk === "CRITICAL"
      ? "bg-red-950 text-red-400"
      : risk === "HIGH"
        ? "bg-orange-950 text-orange-400"
        : risk === "MEDIUM"
          ? "bg-yellow-950 text-yellow-400"
          : "bg-zinc-900 text-zinc-400";

  return (
    <span className={`rounded-full px-2 py-1 text-[11px] ${style}`}>
      {risk}
    </span>
  );
}
