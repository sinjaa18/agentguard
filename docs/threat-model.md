# Threat model

## Assets and boundaries

Assets include Firebase-owned agent configurations, scenarios, evaluation snapshots, traces, and Firebase/Gemini credentials. The browser is an untrusted caller. Gemini responses, user prompts, scenarios, and simulated tool outputs are untrusted data. Firebase Admin is privileged server code. Mock tools are the only execution boundary available to the evaluator.

## Controls implemented

- Evaluation and scenario-generation routes require a verified Firebase ID token; owner UID comes from token claims, never the request body.
- The run route loads the agent and saved scenarios server-side and checks their ownership and parent agent relationship before invoking the runner.
- Requests and scenarios are schema-validated and size-limited. Scenario count, generation count, model response length, tool arguments, steps, tool calls, retry count, per-request provider timeouts, and the shared per-scenario provider budget are bounded. There is no per-process concurrent-run cap.
- Agent outputs are schema-validated before tool use. A tool runs in the mock environment only when it is both configured on the agent and explicitly listed in the current scenario's `tools` allowlist; missing or empty scenario permissions deny dispatch. Tool outputs are labeled untrusted in the next model prompt.
- Deterministic policy findings cannot be erased by a model judge. Evaluation and child record client writes are denied by Firestore rules.
- A shared pre-provider boundary recursively sanitizes model content for agent simulation, judging, and scenario generation. It redacts supported high-confidence credential patterns (named API keys/tokens/passwords/secrets, common provider key prefixes, bearer tokens, and private-key PEM blocks) before Gemini requests. Sanitization failure blocks the request. Detection logs and evaluation events contain only safe categories/counts, never matched values.
- Likely direct identifiers (email addresses, common 10–15 digit phone formats, US `###-##-####` SSNs, and Luhn-valid payment card numbers) block provider requests with a generic instruction to use synthetic/de-identified data. Reserved example domains are allowed for synthetic fixtures. Snapshots, persisted trace/report values, and generated scenario responses redact these supported patterns. Provider credentials remain server-side and are not included in model prompts or intentionally returned to browsers.

## Residual risks and assumptions

- No live Firebase project, production rules deployment, or real multi-user cloud test was available for this work. Emulator tests verify selected rule behaviors only. Deployment must use the included rules and indexes and correct Firebase Admin credentials.
- Concurrent evaluation requests are not capped within a process or across instances. This leaves resource-consumption risk under concurrent load; no concurrency protection is claimed by these tests.
- These patterns are not comprehensive credential or personal-data detection. Other national identifiers, bank/account numbers, names, addresses, sensitive attributes, and nonstandard formats may be missed. Use synthetic or de-identified evaluation data; inspect inputs before sending them to a provider. Credential redaction may alter prompt text, and recorded counts distinguish that from unchanged input.
- Gemini may return invalid, unsafe, or poor-quality content. Zod and tool boundaries constrain actions, but semantic judge output remains fallible.
- The simulator does not execute the user's real agent implementation; its findings may not predict that runtime's behavior.
- The small red-team suite does not cover all attacks, and does not constitute a security guarantee.

## Test coverage and limits

- Offline token and route-seam tests cover missing, malformed, empty, oversized, invalid, expired, and revoked tokens; verified UID extraction; ownership and parent checks; and provider/persistence spies for authorization branches. They do not exercise the routes against a production Firebase project.
- Firestore emulator tests cover anonymous denials, selected cross-user reads and queries, scenario parent ownership and immutable associations, trace/failure parent relationships, and denied client writes to server-owned results. Emulator coverage does not prove deployed rules or indexes are correct.
- Injected-provider runner fixtures cover tool allowlist denials, argument and call limits, repeated calls, timeouts, malformed judge output, provider budget exhaustion, and deterministic policy precedence. They establish scripted runner behavior, not live-model resistance to prompt injection.
- Synthetic credential-like text in mock tool output is tested against the configured redaction patterns. Those tests do not establish comprehensive secret or personal-data detection.

## Out of scope

Arbitrary code execution, shell commands, external customer-system tool calls, embeddings, general-purpose agent integrations, production abuse monitoring, cost controls, comprehensive privacy classification, and process-wide or distributed concurrency limits are not implemented.
