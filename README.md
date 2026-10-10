# AgentGuard

AgentGuard is a developer tool for evaluating tool-using agent behavior against saved scenarios. It combines bounded Gemini simulations, deterministic tool-policy checks, evidence-linked traces, and regression tests in a Firebase-backed workspace.

Evaluating an agent is difficult because task success, policy compliance, and factual grounding are different questions. A plausible answer can still violate a tool policy, while a response can satisfy a task without making factual claims. AgentGuard records these dimensions separately so a run can be inspected and repeated against a fixed configuration snapshot.

## How an evaluation works

1. The signed-in user selects an owned agent and its saved scenarios or the built-in `agentguard-redteam-v1` suite.
2. The server verifies the Firebase ID token, checks resource ownership and scenario-parent relationships, validates the inputs, and freezes the configuration and rubric snapshot.
3. In live mode, Gemini simulates the saved agent prompt and a separate Gemini call judges the response. This is not execution of an arbitrary agent framework or the user's deployed agent.
4. Structured proposed tool calls are validated and dispatched only when the tool is allowed by both the agent configuration and the scenario's explicit allowlist. Tools run in a fixed mock environment; no shell, arbitrary code, network, or external tool action is executed.
5. Deterministic policy and evidence checks remain separate from task-success judging. The run, ordered trace, evidence references, and findings are stored under the authenticated owner. The model judge cannot override a confirmed deterministic policy violation.

Offline evaluation uses synthetic fixtures to exercise evaluator behavior; it does not evaluate the configured agent. Live judging is model-assisted and can be wrong. See [evaluation methodology](docs/evaluation-methodology.md) for the rubric and grounding rules, [architecture](docs/architecture.md) for the execution and persistence boundaries, and the [threat model](docs/threat-model.md) for tested controls and residual risks.

## Screenshots

Screenshots use synthetic/demo data. The dashboard account label is redacted.

| Screen | Screenshot |
| --- | --- |
| Agents | ![Agent list](screenshots/agents.png) |
| Scenario generation | ![Scenario generation](screenshots/scenarios.png) |
| Evaluation | ![Evaluation](screenshots/evaluation.png) |
| Failures | ![Failure analysis](screenshots/failures.png) |
| Dashboard | ![Dashboard](screenshots/overview/dashborad.png) |
| Reliability | ![Reliability](screenshots/realiability.png) |
| Regression | ![Regression](screenshots/regression.png) |

## Local development

Use Node.js 20 or later:

```bash
npm install
Copy-Item .env.example .env.local
npm run emulators
```

Run `npm run dev` in a second terminal. The local template uses the isolated `demo-agentguard-local` Auth and Firestore emulators. Add a Gemini key to the ignored `.env.local` only for a live evaluation; never expose it through a `NEXT_PUBLIC_` variable. See [local emulator setup](docs/local-development.md) for sign-in and configuration details.

For a cloud-connected environment, configure the Firebase client variables and server-only Firebase Admin credentials shown in `.env.example`, plus `GEMINI_API_KEY`. Use Application Default Credentials where appropriate and deploy the included Firestore rules and indexes to the intended project. Emulator tests do not verify deployed cloud configuration or production authorization.

The supported live models are Gemini 3.8 Flash and Gemini 3.6 Flash. The optional `AGENTGUARD_JUDGE_MODEL` selects the judge from that supported list. The retired `/api/evaluation/simulate` route returns 410 and is not a provider proxy.

## Verification

```bash
npm test
npm run eval:benchmark
npm run eval:gate
npx tsc --noEmit
npm run lint
npm run build
npm run test:rules
```

The unit tests, benchmark, and regression gate use deterministic fixtures and do not need Gemini credentials. `npm run test:rules` starts the Firestore emulator. The gate checks evaluator behavior against synthetic cases; it is not a measure of live model accuracy. The CI workflow runs `npm ci`, the test suite, the evaluation gate, and the TypeScript check. It does not currently run the production build.

## Limitations

- Live mode simulates a saved prompt through Gemini; it does not run an arbitrary agent implementation.
- Mock tools and their argument schemas model a small fixed set of actions.
- The judge and grounding analysis can be wrong. Pattern-based credential and identifier detection is not comprehensive privacy scanning.
- The built-in red-team suite is small and does not establish broad security coverage.
- There is no end-user repeated-run experiment workflow, cross-configuration comparison UI, cost estimate, or process-wide concurrent-run cap.
- Firebase rules have emulator coverage, but this repository does not establish that production rules, indexes, credentials, or multi-user deployment have been verified.

## Development attribution

The creator-reported IBM Bob usage note is retained in [IBM_BOB.md](IBM_BOB.md). It does not claim independently verifiable provenance for individual code or test results.
