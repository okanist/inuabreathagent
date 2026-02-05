# Installation Guide - InuaBreath

This guide explains how to run the backend and the app locally for judging.

## Prerequisites
- Python 3.10+ (backend)
- Node.js 18+ and npm (app)
- Git
- An OpenAI-compatible API key for IO Intelligence (or valid environment config)

## Hosted Demo (Optional)
You can also access the web demo here:
```text
https://inuabreathagent.vercel.app/
```

## APK Download
If you prefer installing the Android build directly, download:
```text
Inua.apk
```

## 1) Clone and enter the repo
```bash
git clone <repo-url>
cd InuaBreath
```

## 2) Backend Setup (FastAPI)
```bash
cd backend
python -m venv .venv
```

Activate venv:
- Windows:
```powershell
.\.venv\Scripts\activate
```
- macOS/Linux:
```bash
source .venv/bin/activate
```

Install deps:
```bash
pip install -r requirements.txt
```

### Backend environment variables
Create `backend/.env` with the following:
```
IOINTELLIGENCE_API_KEY=your_key_here
OPIK_API_KEY=your_opik_key_here
OPIK_PROJECT_NAME=InuaBreath
LLM_MODEL_NAME=meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8
INUA_PROMPT_VERSION=v3
ALLOWED_ORIGINS=https://inuabreathagent.vercel.app,https://<your-ngrok-or-domain>
API_AUTH_REQUIRED=true
API_AUTH_KEY=InuaBreath123!
```

### Run backend
```bash
python server.py
```
The API starts on `http://localhost:8001`.

## 3) App Setup (Expo)
```bash
cd app
npm install
```

### App environment variables
Create `app/.env` with the following:
```
EXPO_PUBLIC_API_URL=https://<your-ngrok-or-domain>
EXPO_PUBLIC_API_KEY=InuaBreath123!
```

Notes:
- For local dev without ngrok, use `http://localhost:8001`.
- If you build an APK, `.env` is read at build time. Rebuild the APK when the URL changes.

### Run app (dev)
```bash
npm run start
```
Then run:
- Web: press `w`
- Android emulator: press `a`
- iOS simulator (macOS only): press `i`

## 4) End-to-end test
1. Start backend (`python server.py`).
2. Start app (`npm run start`).
3. Send a message and verify a response.
4. Finish a session and submit feedback.

## 5) Troubleshooting
- If the app cannot reach the backend on Android emulator:
  - It uses `http://10.0.2.2:8001` automatically for localhost.
- If backend is not reachable, check:
  - Port `8001` is free.
  - `IOINTELLIGENCE_API_KEY` is valid.
  - `ALLOWED_ORIGINS` includes your web or ngrok domain.
  - `API_AUTH_KEY` matches `EXPO_PUBLIC_API_KEY`.

## 6) Optional: Opik Evaluation
Run the mini evaluation to create experiments:
```bash
python backend/eval/run_eval_mini.py
```
