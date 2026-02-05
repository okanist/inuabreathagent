# Installation Guide — InuaBreath

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

An Android APK build will be provided separately.

## APK Download
If you prefer installing the Android build directly, download:
```
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
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### Environment variables
Create `backend/.env` with the following:
```
IOINTELLIGENCE_API_KEY=your_key_here
OPIK_API_KEY=your_opik_key_here
OPIK_PROJECT_NAME=InuaBreath
LLM_MODEL_NAME=meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8
INUA_PROMPT_VERSION=v3
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

### Environment variables
Create `app/.env` with the following:
```
EXPO_PUBLIC_API_URL=http://localhost:8001
EXPO_PUBLIC_API_KEY=
```

### Run app
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
- If the app can’t reach the backend on Android emulator:
  - It uses `http://10.0.2.2:8001` automatically for localhost.
- If backend is not reachable, check:
  - Port `8001` is free.
  - `IOINTELLIGENCE_API_KEY` is valid.

## 6) Optional: Opik Evaluation
Run the mini evaluation to create experiments:
```bash
python backend/eval/run_eval_mini.py
```
