import { Agent } from "@/types/agent";

export const demoAgent: Agent = {
  id: "agent_refund_demo",
  name: "Customer Support Refund Agent",
  description:
    "Handles customer refunds, cancellations and support communication.",
  model: "Gemini",
  version: "1.2.0",
  mode: "MOCK",
  reliability: 87,
  security: 82,
  capabilities: [
    "Read data",
    "Modify data",
    "Send messages",
    "Financial actions",
  ],
  tools: [
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
      description: "Issue a refund to a customer.",
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
  ],
};
