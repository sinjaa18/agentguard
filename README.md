# AgentGuard

**Test your AI agents before your users do.**

AgentGuard is an AI agent evaluation and reliability engine — CI/CD infrastructure for autonomous agents. It automatically generates realistic and adversarial test scenarios, runs agents in a sandboxed environment, classifies failures, and produces reliability reports with regression tracking.

---

## Live Demo

🔗 [agentguard.vercel.app](https://agentguard.vercel.app) *(replace with actual Vercel URL)*

📹 [Demo Video](https://youtu.be/your-video-link) *(replace with actual video URL)*

🐙 [GitHub Repository](https://github.com/sinjaa18/agentguard)

---

## The Problem

AI agents use tools, make decisions, and perform consequential real-world actions. Traditional testing relies on a small set of manually written prompts and misses critical failure modes:

- **Prompt Injection** — malicious instructions override system policy
- **Tool Misuse** — agent calls tools outside its authorization
- **Unsafe/Destructive Actions** — agent performs irreversible actions
- **Hallucination** — agent fabricates information it cannot verify
- **Goal Drift** — agent abandons its assigned objective
- **Tool Loops** — agent calls the same tool repeatedly
- **Policy Violations** — agent ignores capability boundaries

---

## The Solution

AgentGuard provides a complete evaluation pipeline:

```
Agent Configuration
      ↓
Scenario Generation (Gemini AI)
      ↓
Adversarial Testing
      ↓
Sandboxed Agent Simulation (Mock Tool Environment)
      ↓
Execution Traces
      ↓
Failure Classification
      ↓
Risk Scoring (0-100, deterministic)
      ↓
Reliability + Security Scorecard
      ↓
Reports + Regression Detection
```

---

## Features

### 1. Scenario Generation Engine
- Reads agent tools, system prompt, capabilities, and task domain
- Generates realistic and adversarial scenarios using **Google Gemini** structured output
- Categories: NORMAL, EDGE_CASE, PROMPT_INJECTION, TOOL_ABUSE, DESTRUCTIVE_ACTION, GOAL_DRIFT, HALLUCINATION, TOOL_LOOP
- Adversarial mode focuses on security-critical scenarios
- Mock fallback when Gemini is unavailable

### 2. Sandboxed Execution Harness
- Agents run against generated scenarios with **mocked tool environments**
- Tools (`get_order`, `issue_refund`, `cancel_order`, `send_email`) return realistic mock responses
- The real world is **never touched** during testing
- All tool calls, arguments, and results are recorded
- Execution traces stored in Firestore for deterministic replay

### 3. Failure Mode Classifier
- Automatically classifies failures into a typed taxonomy
- Categories: PROMPT_INJECTION, TOOL_MISUSE, UNSAFE_ACTION, HALLUCINATION, GOAL_DRIFT, TOOL_LOOP, POLICY_VIOLATION, MISSING_VALIDATION
- Each failure records: observed behavior, expected behavior, risk, root cause, recommended fix

### 4. Destructive Action Guardrail Tester
- Dedicated DESTRUCTIVE_ACTION and TOOL_ABUSE scenario categories
- Policy evaluation checks whether agents attempt unauthorized actions
- Mock environment blocks out-of-authorization tool calls (e.g. refunds over the authorization limit)

### 5. Per-Scenario Risk Scoring
- Deterministic 0–100 risk score per execution
- Score based on: scenario category × severity × pass/fail × tool risk
- Not a random number — reproducible with the same inputs

### 6. Reliability Scorecard
- Overall Reliability, Security, Task Success, Tool Safety, Instruction Following, Adversarial Robustness, Hallucination Resistance, Goal Stability
- All metrics derived from real evaluation results, not demo data

### 7. Regression Tracker
- Compare any two completed evaluations
- Shows: previous reliability, current reliability, delta, new failures, resolved failures
- Status: REGRESSION / IMPROVED / STABLE

### 8. Reports
- Summary report per agent per evaluation
- Includes reliability score, security score, critical findings, and recommendations
- JSON export

---

## Architecture

```
Browser (Next.js App Router)
  │
  ├── /api/scenarios/generate    ← Server-side Gemini call
  ├── /api/evaluation/simulate   ← Server-side Gemini call
  │
  └── Firebase Client SDK
        ├── Firebase Auth
        └── Cloud Firestore
              ├── agents        (ownerId-scoped)
              ├── scenarios     (ownerId + agentId-scoped)
              ├── evaluations   (ownerId + agentId-scoped)
              ├── executionTraces (ownerId + evaluationId-scoped)
              └── failures      (ownerId + evaluationId-scoped)
```

**Gemini API keys are server-side only** — never exposed in `NEXT_PUBLIC_*` variables.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| AI | Google Gemini API (`gemini-2.0-flash`) |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Deployment | Vercel |
| Charts | Recharts |
| Icons | Lucide React |

---

## Local Setup

### Prerequisites

- Node.js 18+
- Firebase project (Authentication + Firestore enabled)
- Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/sinjaa18/agentguard
cd agentguard
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
# Firebase (client-safe)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Gemini (server-side only — NEVER use NEXT_PUBLIC_ here)
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Firebase Firestore Rules

Apply these rules in the Firebase Console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /agents/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.ownerId;
    }
    match /scenarios/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.ownerId;
    }
    match /evaluations/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.ownerId;
    }
    match /executionTraces/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.ownerId;
    }
    match /failures/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.ownerId;
    }
  }
}
```

### 4. Run locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Demo Flow

The recommended demo path:

1. **Login** → `/login`
2. **Create Agent** → `/agents/new` → "Customer Support Refund Agent" with tools: `get_order`, `issue_refund`, `cancel_order`
3. **Generate Scenarios** → `/scenarios` → Generate 10 + Generate Adversarial
4. **Run Evaluation** → `/agents` → Evaluate → watch live execution with tool calls and mock results
5. **Inspect Trace** → Click any scenario trace to see: input → tool → mock result → agent response → policy verdict
6. **View Failures** → `/failures` → see classified failure details
7. **Dashboard** → `/dashboard` → scorecard, reliability trend, failure distribution
8. **Report** → `/reports` → full reliability report with recommendations
9. **Run Second Evaluation** → repeat step 4
10. **Regression** → `/regression` → compare two evaluations

---

## OOSC Challenge Mapping

| Challenge Requirement | Implementation |
|---|---|
| Scenario Generation Engine | `src/lib/scenarios/gemini.ts` + `/api/scenarios/generate` |
| Sandboxed Execution | `src/lib/mock/toolEnvironment.ts` + `src/lib/evaluation/mockEngine.ts` |
| Execution Traces / Replay | `src/lib/firebase/evaluations.ts` — `executionTraces` collection |
| Failure Mode Classifier | `src/lib/evaluation/classifyFailure.ts` |
| Destructive Action Testing | DESTRUCTIVE_ACTION + TOOL_ABUSE scenario categories |
| Reliability Scorecard | `src/lib/scoring/firestoreScore.ts` |
| Regression Tracker | `src/lib/regression/compareEvaluations.ts` |
| Per-scenario Risk Score | `src/lib/scoring/riskScore.ts` |

---

## Known Limitations (Prototype)

- Agent simulation uses Gemini acting as the agent — not a real autonomous agent runtime
- Tool arguments are simplified (mock environment uses default order IDs in this version)
- No streaming evaluation — full scenario runs sequentially
- Firestore rules shown above are suggestions — tighten for production

---

## Future Roadmap

- Real agent SDK integration (LangChain, AutoGen, CrewAI)
- Parallel scenario execution
- Streaming evaluation updates via WebSocket
- Tool argument extraction from Gemini response
- CI/CD webhook integration (GitHub Actions)
- Custom failure taxonomy per organization
- Multi-agent evaluation

---

## Team

Built for the **OOSC Hackathon** and **IBM SkillUp Hackathon**.

AI-assisted development with **IBM Bob**.

---

*AgentGuard — Because your AI agents should be tested, not trusted blindly.*
