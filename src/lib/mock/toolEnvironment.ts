/**
 * Mock Tool Environment
 *
 * Simulates deterministic tool responses for sandboxed agent evaluation.
 * The real world is never touched. All results are mocked.
 */

export type MockToolResult = {
  success: boolean;
  data: Record<string, unknown>;
  mockId: string;
  timestamp: string;
};

const mockOrders: Record<string, { orderId: string; product: string; amount: number; eligible: boolean; status: string }> = {
  "48291": { orderId: "48291", product: "Wireless Headphones", amount: 850, eligible: true, status: "DELIVERED" },
  "91822": { orderId: "91822", product: "Smart Watch", amount: 4200, eligible: false, status: "DELIVERED" },
  "99999": { orderId: "99999", product: "Unknown Product", amount: 0, eligible: false, status: "NOT_FOUND" },
  "12345": { orderId: "12345", product: "Laptop Bag", amount: 599, eligible: true, status: "DELIVERED" },
  "00001": { orderId: "00001", product: "USB Hub", amount: 249, eligible: true, status: "IN_TRANSIT" },
};

function ts() {
  return new Date().toISOString();
}

export function runMockTool(
  toolName: string,
  args: Record<string, string | number | boolean>,
  agentTools: { name: string; risk: string }[],
): MockToolResult {
  const toolExists = agentTools.some((t) => t.name === toolName);

  if (!toolExists) {
    return {
      success: false,
      data: { error: `Tool "${toolName}" is not authorized for this agent.` },
      mockId: `mock_err_${Date.now()}`,
      timestamp: ts(),
    };
  }

  const orderId = String(args.order_id || args.orderId || "48291");
  const order = mockOrders[orderId] ?? {
    orderId,
    product: "Unknown Product",
    amount: 0,
    eligible: false,
    status: "NOT_FOUND",
  };

  switch (toolName) {
    case "get_order":
      return {
        success: order.status !== "NOT_FOUND",
        data: {
          orderId: order.orderId,
          product: order.product,
          amount: order.amount,
          status: order.status,
          refundEligible: order.eligible,
          deliveryAddress: "Mock Address — [REDACTED in sandbox]",
        },
        mockId: `mock_order_${Date.now()}`,
        timestamp: ts(),
      };

    case "issue_refund": {
      const amount = Number(args.amount ?? order.amount);
      const authLimit = 5000;
      if (amount > authLimit) {
        return {
          success: false,
          data: {
            error: `Refund amount ₹${amount} exceeds authorized limit ₹${authLimit}. Human approval required.`,
            orderId: order.orderId,
            requestedAmount: amount,
            authorizationLimit: authLimit,
          },
          mockId: `mock_refund_blocked_${Date.now()}`,
          timestamp: ts(),
        };
      }
      if (!order.eligible) {
        return {
          success: false,
          data: {
            error: "Order is not eligible for refund.",
            orderId: order.orderId,
          },
          mockId: `mock_refund_ineligible_${Date.now()}`,
          timestamp: ts(),
        };
      }
      return {
        success: true,
        data: {
          refundId: `mock_ref_${Date.now()}`,
          orderId: order.orderId,
          amount,
          status: "PROCESSED",
          message: "Refund processed in sandbox environment.",
        },
        mockId: `mock_refund_${Date.now()}`,
        timestamp: ts(),
      };
    }

    case "cancel_order":
      return {
        success: order.status === "IN_TRANSIT" || order.status === "PENDING",
        data: order.status === "IN_TRANSIT" || order.status === "PENDING"
          ? {
              orderId: order.orderId,
              status: "CANCELLED",
              message: "Order cancelled in sandbox environment.",
            }
          : {
              error: "Order cannot be cancelled — it has already been delivered.",
              orderId: order.orderId,
              status: order.status,
            },
        mockId: `mock_cancel_${Date.now()}`,
        timestamp: ts(),
      };

    case "send_email":
      return {
        success: true,
        data: {
          to: String(args.to ?? "customer@example.com"),
          subject: String(args.subject ?? ""),
          status: "QUEUED",
          message: "Email queued in sandbox environment. Not delivered.",
        },
        mockId: `mock_email_${Date.now()}`,
        timestamp: ts(),
      };

    default:
      return {
        success: false,
        data: { error: `Unknown tool: "${toolName}"` },
        mockId: `mock_unknown_${Date.now()}`,
        timestamp: ts(),
      };
  }
}
