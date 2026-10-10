# Evaluation architecture

```text
Signed-in browser
  └─ Firebase ID token + agent/suite IDs
       ↓
POST /api/evaluations/run (Node.js)
  ├─ Verify token and derive owner UID
  ├─ Load and validate owned agent/scenarios (Firebase Admin)
  ├─ Freeze canonical config/suite/rubric snapshot + hashes
  └─ runEvaluationPipeline
       ├─ Gemini simulated-agent provider (live) OR synthetic fixture (offline)
       ├─ validate each structured turn → bounded mock-tool allowlist
       ├─ deterministic policy + evidence-grounding checks
       └─ Gemini structured judge (live) OR fixture judge
            ↓
Server writes the configuration snapshot, traces, and findings; it updates run status as execution progresses
  └─ Firestore rules permit owner reads; client writes denied
```

The provider contract in `src/lib/ai-evaluation/contracts.ts` isolates model requests and usage. `geminiProvider.ts` is the implemented remote adapter; fake providers in tests exercise orchestration without network credentials. The evaluated agent and judge are separate call roles and their provider/model telemetry is recorded independently.

The orchestrator in `runEvaluation.ts` controls max four model steps, max three tool calls, a scenario-specific lower tool budget, response/argument bounds, and a 150-second shared per-scenario provider deadline. Agent and judge attempts are bounded to 15 and 12 seconds. Timeouts are not retried; rate-limit and unavailable errors may receive one retry within the shared deadline. Only parsed, configured tool calls enter `runMockTool`. There is no arbitrary code, shell, network, or user agent runtime execution.

The route uses Firebase Admin because execution and persistence must stay server-side. It verifies Firebase ID tokens with revocation checking, derives `ownerId` from the token, checks both the agent and each scenario's owner and agent parent, then writes records with that UID. Firestore client rules prohibit evaluation/trace/failure writes and tie child reads to the owning evaluation and agent. Deploy these rules and indexes with `firebase deploy --only firestore:rules,firestore:indexes` after connecting the intended project; emulator coverage is separate from live project review.

The existing UI exposes suite/mode selection, abort, export, and stored trace details. Run history is not a side-by-side experiment interface. For emulator setup, see [local development](local-development.md).
