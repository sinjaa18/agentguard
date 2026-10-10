import test from "node:test";
import assert from "node:assert/strict";
import { EvaluationResponseError, readEvaluationResponse } from "../src/lib/evaluation/evaluationResponse.ts";

function successfulRun(overrides = {}) {
  return {
    evaluationId: "evaluation-fixture",
    status: "COMPLETED",
    total: 1,
    completed: 1,
    passed: 1,
    failed: 0,
    unjudgeable: 0,
    report: { results: [{ scenarioId: "scenario-fixture", status: "COMPLETED", passed: true }] },
    ...overrides,
  };
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

test("evaluation response parser accepts a valid JSON success response", async () => {
  const parsed = await readEvaluationResponse(jsonResponse(successfulRun()));
  assert.equal(parsed.evaluationId, "evaluation-fixture");
  assert.equal(parsed.status, "COMPLETED");
  assert.equal(parsed.report.results[0].passed, true);
});

test("JSON API errors remain errors and untrusted server messages are not displayed", async () => {
  const response = jsonResponse({ error: "PROVIDER_NOT_CONFIGURED", message: "private key=do-not-display" }, 503);
  await assert.rejects(readEvaluationResponse(response), (error) => {
    assert.ok(error instanceof EvaluationResponseError);
    assert.match(error.message, /GEMINI_API_KEY/);
    assert.match(error.message, /Vercel/);
    assert.doesNotMatch(error.message, /private key|do-not-display/);
    return true;
  });
});

test("empty response bodies fail with the HTTP status and no fabricated result", async () => {
  await assert.rejects(readEvaluationResponse(new Response(null, { status: 500 })), (error) => {
    assert.ok(error instanceof EvaluationResponseError);
    assert.match(error.message, /HTTP 500/);
    assert.match(error.message, /empty response/);
    return true;
  });
});

test("malformed JSON and non-JSON platform errors fail safely", async () => {
  for (const response of [
    new Response("{not-json", { status: 500, headers: { "Content-Type": "application/json" } }),
    new Response("<html>platform failure</html>", { status: 502, headers: { "Content-Type": "text/html" } }),
  ]) {
    await assert.rejects(readEvaluationResponse(response), (error) => {
      assert.ok(error instanceof EvaluationResponseError);
      assert.match(error.message, /HTTP 50[02]/);
      assert.doesNotMatch(error.message, /platform failure|not-json/);
      return true;
    });
  }
});

test("provider timeout remains an incomplete UNJUDGEABLE result, not a pass", async () => {
  const partial = successfulRun({
    status: "PARTIAL",
    completed: 0,
    passed: 0,
    unjudgeable: 1,
    report: { results: [{ scenarioId: "scenario-fixture", status: "UNJUDGEABLE", passed: false, errorCategory: "TIMEOUT" }] },
  });
  const parsed = await readEvaluationResponse(jsonResponse(partial));
  assert.equal(parsed.status, "PARTIAL");
  assert.equal(parsed.passed, 0);
  assert.equal(parsed.report.results[0].status, "UNJUDGEABLE");
  assert.equal(parsed.report.results[0].passed, false);
});

test("provider execution failures remain rejected JSON errors", async () => {
  await assert.rejects(readEvaluationResponse(jsonResponse({ error: "EVALUATION_FAILED", message: "internal stack" }, 500)), (error) => {
    assert.ok(error instanceof EvaluationResponseError);
    assert.match(error.message, /HTTP 500/);
    assert.doesNotMatch(error.message, /internal stack/);
    return true;
  });
});

test("missing provider configuration returns an actionable safe error", async () => {
  await assert.rejects(readEvaluationResponse(jsonResponse({ error: "PROVIDER_NOT_CONFIGURED", message: "secret omitted" }, 503)), (error) => {
    assert.match(error.message, /GEMINI_API_KEY/);
    assert.doesNotMatch(error.message, /secret omitted/);
    return true;
  });
});

test("authentication failure remains an HTTP 401 error", async () => {
  await assert.rejects(readEvaluationResponse(jsonResponse({ error: "UNAUTHORIZED", message: "token omitted" }, 401)), (error) => {
    assert.match(error.message, /HTTP/);
    assert.match(error.message, /Sign in again/);
    assert.doesNotMatch(error.message, /token omitted/);
    return true;
  });
});

test("interrupted response body is reported without parsing or accepting a result", async () => {
  const interrupted = {
    ok: true,
    status: 200,
    text: async () => { throw new TypeError("stream disconnected"); },
  };
  await assert.rejects(readEvaluationResponse(interrupted), (error) => {
    assert.ok(error instanceof EvaluationResponseError);
    assert.match(error.message, /interrupted/);
    assert.match(error.message, /HTTP 200/);
    return true;
  });
});
