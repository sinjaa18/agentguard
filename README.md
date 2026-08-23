# 🛡️ AgentGuard

![Next.js](https://img.shields.io/badge/Next.js-16.3.2-000000?style=flat\&logo=next.js\&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat\&logo=typescript\&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat\&logo=firebase\&logoColor=black)
![Gemini](https://img.shields.io/badge/Gemini%20AI-4285F4?style=flat\&logo=google\&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat\&logo=tailwindcss\&logoColor=white)

An AI agent reliability and security evaluation platform built to test, analyze, and monitor the behavior of AI agents.

AgentGuard allows developers to define AI agents, generate reliability and adversarial scenarios, run evaluations, inspect execution traces, detect failures, calculate reliability scores, generate reports, and compare evaluation runs for regressions.

---

# 🌐 Demo

## Local Development

```text
http://localhost:3000
```

## Production

Add your deployed Vercel URL here:

```text
https://your-agentguard.vercel.app
```

---

# ✨ Features

## 🤖 Agent Management

* Create AI agents
* Configure model information
* Configure capabilities
* Configure authorized tools
* Define tool risk levels
* Agent-specific evaluation workflows

---

## 🧪 Scenario Generation

* Generate reliability test scenarios
* Generate adversarial security scenarios
* Prompt injection tests
* Tool abuse tests
* Destructive action tests
* Goal drift tests
* Hallucination tests
* Tool loop tests
* Edge-case scenarios
* Scenario filtering by category and severity

### AI Generation

AgentGuard uses Gemini to generate structured test scenarios.

```text
Agent Configuration
       ↓
Gemini
       ↓
Structured Scenarios
       ↓
Scenario Validation
       ↓
Firestore
```

A fallback mock generator is available when Gemini is temporarily unavailable.

---

## 🔐 Security Evaluation

AgentGuard evaluates AI agent behavior against security policies including:

* Prompt Injection Resistance
* Tool Authorization
* Destructive Action Safety
* Hallucination Resistance
* Goal Stability
* Tool Loop Detection
* Policy Compliance

---

## ▶️ Evaluation Engine

Run an evaluation against an agent's scenario suite.

The evaluation pipeline tracks:

```text
Scenario
   ↓
Agent Simulation
   ↓
Tool Decision
   ↓
Security Policy Analysis
   ↓
PASS / FAIL
```

Each scenario records execution events and evaluation results.

---

## 🔎 Execution Traces

Every evaluation provides detailed execution traces including:

* Scenario execution state
* Tool decisions
* Agent response
* Security analysis
* Pass/fail result
* Evaluation events

---

## 🚨 Failure Analysis

AgentGuard automatically classifies failures into categories such as:

* Prompt Injection
* Tool Misuse
* Unsafe Action
* Hallucination
* Goal Drift
* Tool Loop
* Policy Violation
* Missing Validation

Each failure contains:

* Observed Behavior
* Expected Behavior
* Risk
* Root Cause
* Recommended Fix
* Severity

---

## 📊 Dashboard

The dashboard provides an overview of an agent's reliability and security posture.

Includes:

* Reliability Score
* Security Score
* Task Success
* Tool Safety
* Instruction Following
* Adversarial Robustness
* Hallucination Resistance
* Goal Stability
* Total Evaluations
* Total Scenarios
* Failure Count
* Critical Failures
* Reliability Trend
* Failure Distribution
* Recent Evaluations

---

## 📑 Reliability Reports

Generate engineering-focused reliability reports containing:

* Executive Summary
* Reliability Score
* Security Score
* Evaluation Summary
* Failure Breakdown
* Scenario Results
* Evaluation History
* Recommendations

Reports can also be exported as JSON.

---

## 🔄 Regression Testing

Compare two completed evaluations to identify:

* Reliability changes
* New failures
* Resolved failures
* Regression
* Improvement
* Stable behavior

Example:

```text
Previous Evaluation
        ↓
Current Evaluation
        ↓
Compare Results
        ↓
Regression Analysis
```

---

## 📈 Version Comparison

Compare evaluation performance across different runs.

Metrics include:

* Reliability
* Task Success
* Failed Scenarios
* Total Scenarios

---

# 📸 Screenshots

Add screenshots to the repository and update these paths.

## Login

![Login](./screenshots/login.png)

---

## Dashboard

![Dashboard](./screenshots/dashboard.png)

---

## Agent

![Agent](./screenshots/agent.png)

---

## Scenario Generator

![Scenarios](./screenshots/scenarios.png)

---

## Evaluation

![Evaluation](./screenshots/evaluation.png)

---

## Failure Analysis

![Failures](./screenshots/failures.png)

---

## Reliability Report

![Report](./screenshots/report.png)

---

# 🛠️ Tech Stack

## Frontend

* Next.js 16
* React
* TypeScript
* Tailwind CSS
* Recharts
* Lucide React

---

## Backend / Server

* Next.js App Router
* Next.js API Routes
* Server-side Gemini integration

---

## Database & Authentication

* Firebase Authentication
* Cloud Firestore

---

## AI

* Google Gemini API
* Structured JSON generation
* AI-powered agent simulation
* Mock fallback generation

---

# 🧠 Architecture

```text
                    AgentGuard
                        │
          ┌─────────────┴─────────────┐
          │                           │
       Frontend                    Firebase
          │                           │
      Next.js UI               Authentication
          │                    + Firestore
          │                           │
          └─────────────┬─────────────┘
                        │
                  Evaluation Engine
                        │
             ┌──────────┴──────────┐
             │                     │
          Gemini                Fallback
       Agent Simulation        Mock Engine
             │                     │
             └──────────┬──────────┘
                        │
                 Policy Evaluation
                        │
             ┌──────────┼──────────┐
             │          │          │
           Traces     Failures    Scores
             │          │          │
             └──────────┼──────────┘
                        │
              Reports / Regression
```

---

# 🔐 Authentication Flow

```text
User
 ↓
Firebase Authentication
 ↓
Authenticated Session
 ↓
Protected Routes
 ↓
AgentGuard Dashboard
```

---

# 🧪 Evaluation Flow

```text
Select Agent
      ↓
Load Scenarios
      ↓
Run Evaluation
      ↓
Gemini Agent Simulation
      ↓
Tool / Behavior Analysis
      ↓
Security Policy Evaluation
      ↓
PASS / FAIL
      ↓
Execution Trace
      ↓
Failure Classification
      ↓
Firestore
      ↓
Dashboard / Report / Regression
```

---

# 📂 Folder Structure

```text
agentguard/
│
├── public/
│
├── src/
│   ├── app/
│   │   ├── agents/
│   │   ├── dashboard/
│   │   ├── evaluations/
│   │   ├── failures/
│   │   ├── regression/
│   │   ├── reports/
│   │   ├── scenarios/
│   │   ├── test-suites/
│   │   ├── versions/
│   │   └── api/
│   │       ├── evaluation/
│   │       └── scenarios/
│   │
│   ├── components/
│   │   ├── agents/
│   │   ├── auth/
│   │   └── dashboard/
│   │
│   ├── data/
│   │
│   ├── lib/
│   │   ├── dashboard/
│   │   ├── evaluation/
│   │   ├── firebase/
│   │   ├── gemini/
│   │   ├── regression/
│   │   ├── reports/
│   │   ├── scenarios/
│   │   ├── scoring/
│   │   └── versions/
│   │
│   └── types/
│
├── .env.local
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

# 🔑 Environment Variables

Create:

```text
.env.local
```

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

GEMINI_API_KEY=your_gemini_api_key
```

### ⚠️ Important

Never commit `.env.local` to GitHub.

The Gemini API key must remain server-side:

```text
GEMINI_API_KEY
```

Do **not** use:

```text
NEXT_PUBLIC_GEMINI_API_KEY
```

---

# ⚙️ Installation & Setup

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/agentguard.git

cd agentguard
```

---

## Install Dependencies

```bash
npm install
```

---

## Configure Environment

Create:

```text
.env.local
```

and add the Firebase and Gemini environment variables.

---

## Run Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🏗️ Production Build

Check TypeScript:

```bash
npx tsc --noEmit
```

Create a production build:

```bash
npm run build
```

Run production server:

```bash
npm start
```

---

# 🔥 Firebase Setup

## Authentication

Enable Firebase Authentication and configure the required sign-in provider.

Add your production domain under:

```text
Firebase Console
→ Authentication
→ Settings
→ Authorized Domains
```

---

## Firestore

Create a Firestore database and configure collections used by AgentGuard.

Main collections:

```text
agents
scenarios
evaluations
executionTraces
failures
```

---

# 🔒 Security

AgentGuard uses Firebase Authentication and owner-based Firestore authorization.

Data ownership follows:

```text
Authenticated User
       ↓
ownerId
       ↓
Agent
       ↓
Scenarios
Evaluations
Execution Traces
Failures
```

Firestore rules should ensure users can only access their own data.

---

# 🤖 Gemini Integration

Gemini is used for:

### Scenario Generation

```text
Agent Configuration
        ↓
Gemini
        ↓
Structured Test Scenarios
```

### Agent Simulation

```text
Agent Configuration
        ↓
Scenario
        ↓
Gemini
        ↓
Simulated Agent Response
        ↓
Policy Evaluation
```

### Fallback

When Gemini is temporarily unavailable:

```text
Gemini
   ↓
Unavailable
   ↓
Mock Scenario Generator
```

This ensures the prototype can continue operating during temporary AI API availability issues.

---

# 📡 API Routes

## Scenario Generation

```http
POST /api/scenarios/generate
```

Generates structured evaluation scenarios using Gemini.

---

## Agent Simulation

```http
POST /api/evaluation/simulate
```

Simulates agent behavior for a selected evaluation scenario.

---

# 🛡️ Security Test Categories

AgentGuard currently supports:

```text
NORMAL
EDGE_CASE
PROMPT_INJECTION
TOOL_ABUSE
DESTRUCTIVE_ACTION
GOAL_DRIFT
HALLUCINATION
TOOL_LOOP
```

---

# 📊 Reliability Metrics

AgentGuard calculates:

```text
Overall Reliability
Security
Task Success
Tool Safety
Instruction Following
Adversarial Robustness
Hallucination Resistance
Goal Stability
```

Scores are generated from evaluation results and detected failures.

---

# 🚀 Deployment

AgentGuard can be deployed using Vercel.

```text
GitHub
   ↓
Vercel
   ↓
Next.js Application
   ↓
Firebase
   +
Gemini API
```

### Environment Variables

Configure all `.env.local` values in:

```text
Vercel
→ Project
→ Settings
→ Environment Variables
```

---

# 🔮 Future Improvements

* Real agent endpoint integrations
* OpenAI / Anthropic / other model providers
* Custom evaluation policies
* Scheduled evaluations
* Continuous regression monitoring
* CI/CD integration
* Webhook-based evaluation triggers
* Team collaboration
* Role-based access control
* Advanced trace visualization
* Evaluation trend analytics
* Automated remediation suggestions
* Production agent connectors

---

# ⭐ Support

If you found AgentGuard useful, consider giving the repository a ⭐ on GitHub.
