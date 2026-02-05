# Engineering Notes

This document consolidates app and backend technical notes that were previously scattered across multiple files.
For setup steps, see `INSTALLATION_GUIDE.md`.

## Architecture
- **App (React Native / Expo):** UI + session playback + user input.
- **Backend (FastAPI):** safety guardrails, technique selection, LLM orchestration, Opik tracing/evaluation.

## App Notes

### Android Keyboard Stability (MIUI/Xiaomi)
Some devices (especially MIUI) handle keyboard resizing unpredictably.
We force `adjustNothing` and manage padding manually.

Key pieces:
- `app/app.json`: `softwareKeyboardLayoutMode` set to `adjustNothing`.
- `app/app/home.tsx`: manual padding with keyboard show/hide listeners and debouncing.

If you change keyboard behavior, re-test on MIUI devices.

## Web / Ngrok
For web or external testing, expose the backend and point the app to that URL.

App `.env` example:
```
EXPO_PUBLIC_API_URL=https://<your-ngrok-or-domain>
EXPO_PUBLIC_API_KEY=<your-api-key>
```

Backend `.env` example:
```
ALLOWED_ORIGINS=https://inuabreathagent.vercel.app,https://<your-ngrok-or-domain>
API_AUTH_REQUIRED=true
API_AUTH_KEY=<same-api-key-as-app>
```

Tip: Use a reserved ngrok domain to avoid rebuilding the APK when the URL changes.

## Crisis Guardrail (Backend)
The backend uses a separate crisis guardrail that runs *before* technique selection:
- Stage 1: English-only keyword fast-path (low latency, low cost)
- Stage 2: LLM crisis intent classifier fallback (better intent understanding, higher latency/cost)

Opik:
- See `guardrail_crisis_check` span metadata: `crisis_check_method` and `crisis_check_ms`.

Configuration:
- `CRISIS_MODEL_NAME`: optional model override for the crisis classifier (defaults to `LLM_MODEL_NAME`).

## Backend Deployment (Docker)
Quick start:
```bash
cd backend
docker-compose up -d
```

Health check:
```bash
curl http://localhost:8001/health
```

Logs:
```bash
docker-compose logs -f
```

## VPS Manual Update
```bash
ssh user@your-vps
cd /path/to/backend
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d
```

## Windows Firewall (Port 8001)
If a phone cannot reach `http://<PC_IP>:8001/health`, open the port:
```powershell
netsh advfirewall firewall add rule name="Inua Backend 8001" dir=in action=allow protocol=TCP localport=8001
```

## Files Required for Backend Deployment
Minimum:
```
backend/server.py
backend/requirements.txt
backend/all_db.json
backend/Dockerfile
backend/docker-compose.yml
backend/.env (created on server)
```
