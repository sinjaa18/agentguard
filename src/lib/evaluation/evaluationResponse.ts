export type EvaluationApiResponse = {
  evaluationId: string;
  status: "COMPLETED" | "PARTIAL" | "CANCELLED";
  total: number;
  completed: number;
  passed: number;
  failed: number;
  unjudgeable?: number;
  report: Record<string, unknown> & { results: Record<string, unknown>[] };
};

export class EvaluationResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationResponseError";
  }
}

/** Parse only complete, valid evaluation responses and never surface server-provided details. */
export async function readEvaluationResponse(response: Response): Promise<EvaluationApiResponse> {
  let body: string;
  try {
    body = await response.text();
  } catch {
    throw responseError(response.status, "The response was interrupted");
  }

  if (!body.trim()) throw responseError(response.status, "The server returned an empty response");

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    throw responseError(response.status, "The server returned a non-JSON response");
  }

  if (!response.ok) {
    const code = isRecord(value) && typeof value.error === "string" ? value.error : "";
    throw new EvaluationResponseError(safeErrorMessage(response.status, code));
  }

  if (!isEvaluationResponse(value)) {
    throw responseError(response.status, "The server returned an invalid evaluation response");
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEvaluationResponse(value: unknown): value is EvaluationApiResponse {
  if (!isRecord(value) || !isRecord(value.report)) return false;
  return typeof value.evaluationId === "string"
    && ["COMPLETED", "PARTIAL", "CANCELLED"].includes(String(value.status))
    && [value.total, value.completed, value.passed, value.failed].every((count) => typeof count === "number" && Number.isFinite(count))
    && Array.isArray(value.report.results)
    && value.report.results.every(isRecord);
}

function responseError(status: number, reason: string): EvaluationResponseError {
  return new EvaluationResponseError(`Evaluation request failed (HTTP ${status}): ${reason}. Check the deployment function logs and configuration.`);
}

function safeErrorMessage(status: number, code: string): string {
  if (status === 401 || code === "UNAUTHORIZED") return `Your session could not be verified (HTTP ${status}). Sign in again and retry.`;
  if (code === "PROVIDER_NOT_CONFIGURED") return `Live evaluation is not configured on this deployment (HTTP ${status}). Set GEMINI_API_KEY in Vercel and redeploy.`;
  if (code === "FIREBASE_ADMIN_NOT_CONFIGURED") return `Evaluation storage is not configured on this deployment (HTTP ${status}). Check the server Firebase Admin settings.`;
  if (status === 429 || code === "RATE_LIMIT" || code === "RUN_CAPACITY") return `Evaluation service is busy (HTTP ${status}). Wait briefly and retry.`;
  if (code === "TIMEOUT" || status === 504) return `Evaluation timed out (HTTP ${status}). Try a smaller suite or inspect the deployment logs.`;
  if (status >= 500) return `Evaluation service failed (HTTP ${status}). Check the deployment function logs and server configuration.`;
  return `Evaluation request was rejected (HTTP ${status}). Review the selected agent and suite, then retry.`;
}
