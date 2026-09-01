# IBM Bob Usage in AgentGuard

## Overview

IBM Bob (an AI-powered development assistant) was used throughout the development of AgentGuard as an active engineering collaborator — from initial architecture decisions through implementation, debugging, and documentation.

This document describes the actual, verifiable ways IBM Bob contributed to the project.

---

## Project Planning

IBM Bob was used to:

- Analyse the hackathon problem statement and identify the core technical requirements (sandboxed execution, failure taxonomy, reliability scoring, regression detection)
- Break down the product into implementable phases (Phase A: Stability → Phase B: Evaluation credibility → Phase C: Sandbox story → Phase D: Failure analysis → Phase E: Risk scoring → Phase F: Scorecard → Phase G: Regression → Phase H: Reports)
- Define the data model: `agents → scenarios → evaluations → executionTraces → failures`, with `ownerId` enforced at every layer
- Identify which features were genuinely implemented vs. which were demo/mock data, preventing false claims in the submission

---

## Architecture Assistance

IBM Bob helped design:

- **Firebase Firestore ownership model** — all collections scoped to `ownerId` via `where("ownerId", "==", ownerId)` queries
- **Server-side Gemini integration** — ensuring the API key stays server-only via Next.js API routes (`/api/scenarios/generate`, `/api/evaluation/simulate`), never exposed as `NEXT_PUBLIC_*`
- **Mock Tool Environment** (`src/lib/mock/toolEnvironment.ts`) — deterministic sandboxed responses for `get_order`, `issue_refund`, `cancel_order`, `send_email` without touching the real world
- **Evaluation pipeline**: `runDemoEvaluation` → Gemini simulation → mock tool call → `evaluateScenario` policy check → `calculateRiskScore` → Firestore persistence
- **Deterministic risk scoring** (`src/lib/scoring/riskScore.ts`) — category + severity + pass/fail inputs produce a reproducible 0–100 score
- **Regression comparison** (`src/lib/regression/compareEvaluations.ts`) — comparing two `EvaluationDocument` snapshots to produce REGRESSION / IMPROVED / STABLE

---

## Code Development

IBM Bob wrote or significantly assisted with:

- `src/lib/mock/toolEnvironment.ts` — full mock tool sandbox with realistic responses per tool
- `src/lib/scoring/riskScore.ts` — deterministic per-scenario risk scorer
- `src/lib/evaluation/types.ts` — enriched `ScenarioExecution` type with `agentResponse`, `toolUsed`, `toolResult`, `reason`, `riskScore`
- `src/types/database.ts` — added enriched optional fields to `ExecutionTraceDocument`
- `src/lib/evaluation/mockEngine.ts` — full rewrite integrating mock tool environment and risk scoring
- `src/app/evaluations/page.tsx` — complete rewrite with `useSearchParams` for pre-selected agent from `/agents`, `Suspense` boundary, and rich execution display
- `src/components/agents/AgentSelector.tsx` — fixed infinite render loop caused by `onChange` reference instability; added `preselect` prop
- `src/app/evaluations/[evaluationId]/traces/[scenarioId]/page.tsx` — enriched trace detail showing userInput → tool → mockResult → agentResponse → policy result
- `src/app/settings/page.tsx` — new page to resolve missing route referenced in Sidebar
- `src/lib/gemini/server.ts` — corrected model names from non-existent `gemini-3.7-flash` to real `gemini-2.0-flash`

---

## Debugging and Error Resolution

IBM Bob identified and resolved:

1. **Wrong Gemini model names** — `gemini-3.7-flash` / `gemini-3.6-flash` do not exist; corrected to `gemini-2.0-flash` / `gemini-1.5-flash`. This was silently causing every Gemini call to fail and fall through to mock fallback.

2. **Evaluate flow broken** — `/agents` page "Evaluate" button navigated to `/agents/[agentId]` which then navigated to `/evaluations` without the agent context. Fixed by linking directly to `/evaluations?agentId=X` and reading `useSearchParams` on the evaluations page.

3. **`AgentSelector` infinite render loop** — `useEffect` depended on `[value, onChange]`, but `onChange` is a new reference on every render. Fixed with `useRef` guard and empty dependency array.

4. **Stray directory** — `src/lib/evaluation/src/app/regression/` was an empty leftover from a bad previous edit. Removed.

5. **Missing `/settings` route** — Sidebar linked to `/settings` which had no page, causing 404. Added stub page.

6. **`useSearchParams` requires Suspense** — Next.js App Router requires wrapping components that call `useSearchParams()` in `<Suspense>`. IBM Bob identified and applied the correct wrapper pattern.

---

## UI/UX Development

IBM Bob contributed to:

- Evaluations page rich execution display: per-scenario panels showing user input, category/severity, tool called, mock result, agent response, pass/fail reason
- Trace detail page: structured sections — user input → scenario context → tool call (mock sandbox) → agent response → policy evaluation → raw events log
- Risk score display with colour-coded thresholds (green < 40, orange 40–70, red ≥ 70)
- Consistent empty states and loading states across all agent-scoped pages
- Evaluation history table with reliability % column

---

## Testing and Validation

IBM Bob ran validation at each stage:

```
npx tsc --noEmit     # TypeScript — 0 errors
npm run build        # Production build — clean, 19 routes
```

Both commands pass after all changes.

---

## Documentation

IBM Bob authored:

- This `IBM_BOB.md` document
- The complete `README.md` with architecture, setup instructions, and hackathon challenge mapping
- Code comments in `toolEnvironment.ts` and `riskScore.ts` explaining the deterministic scoring rules

---

## Example Development Workflow

A typical IBM Bob-assisted development session looked like:

1. **Inspect** — IBM Bob read all relevant files before touching anything
2. **Diagnose** — identified root cause (e.g., wrong Gemini model names) rather than patching symptoms
3. **Plan** — proposed minimal changes scoped to the exact problem
4. **Implement** — wrote the fix with full file context
5. **Validate** — ran `npx tsc --noEmit` and `npm run build` to confirm no regressions
6. **Document** — updated todo list and noted what changed

IBM Bob acted as an engineering partner, not an autonomous agent — all code was reviewed in context and aligned with the project's architecture and security requirements.

---

*AgentGuard — AI Agent Evaluation & Reliability Engine*
*Submitted to: OOSC Hackathon + IBM SkillUp Hackathon*
