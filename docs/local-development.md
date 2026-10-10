# Local development

## Firebase emulators

Copy `.env.example` to `.env.local`. It configures the browser and Firebase Admin SDK for the isolated `demo-agentguard-local` project and loopback Auth (`127.0.0.1:9099`) and Firestore (`127.0.0.1:8180`) emulators. Admin emulator mode is enabled only by the explicit development setting and matching demo project/endpoints. No service-account key is needed in that mode. Production configuration rejects emulator settings.

Start the Auth and Firestore emulators and the app in separate terminals:

```bash
npm run emulators
npm run dev
```

Register a local account in the app, then create or select a local agent and scenario. Emulator accounts and records remain in the local demo project. The rules test uses the same project ID through `npm run test:rules`.

## Live Gemini evaluation

The template intentionally contains no Gemini key. To run a live evaluation, add a verified, rotated key as `GEMINI_API_KEY` in ignored `.env.local`; never use a `NEXT_PUBLIC_` variable. Live mode makes Gemini requests for both the simulated agent and judge. Tool execution remains limited to the mock environment. Do not use production Firebase credentials for this local workflow.

Never commit `.env.local`; it may contain credentials.
