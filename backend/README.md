# Backend Structure

## Core
- `server.py`: FastAPI app and agent orchestration
- `all_db.json`: breathing technique database
- `docker-compose.yml`, `Dockerfile`, `requirements.txt`: runtime and deployment
- `eval/`: Opik evaluation datasets and runners

## Scripts
Operational and helper scripts are under `scripts/`:
- `scripts/deploy-vps.sh`
- `scripts/ngrok-setup.sh`
- `scripts/debug_api.ps1`
- `scripts/allow-port-8001.ps1`

## Manual Tests
Ad-hoc/manual test scripts are under `tests/manual/`.
Examples:
- `python backend/tests/manual/test_new_api.py`
- `python backend/tests/manual/test_full_api.py`
- `python backend/tests/manual/test_opik_trace.py`

## Notes
- Keep production runtime files in backend root.
- Keep temporary outputs and local experiment artifacts out of git.
