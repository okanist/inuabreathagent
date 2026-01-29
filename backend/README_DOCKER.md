# Docker Deployment Guide

## Quick Start

### 1. Build and Run with Docker Compose

```bash
cd backend
docker-compose up -d
```

### 2. Build and Run with Docker

```bash
cd backend
docker build -t inua-breath-backend .
docker run -d \
  --name inua-breath-backend \
  -p 8001:8001 \
  -e IOINTELLIGENCE_API_KEY=your_key_here \
  -e OPIK_API_KEY=your_key_here \
  -e OPIK_PROJECT_NAME=InuaBreath \
  -e INUA_PROMPT_VERSION=v3 \
  inua-breath-backend
```

## Environment Variables

Create a `.env` file or pass environment variables:

```env
# Required
IOINTELLIGENCE_API_KEY=your_io_intelligence_api_key

# Optional (Opik)
OPIK_API_KEY=your_opik_api_key
OPIK_PROJECT_NAME=InuaBreath

# Optional (Model)
LLM_MODEL_NAME=meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8
INUA_PROMPT_VERSION=v3
INUA_MODEL_VERSION=meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8

# Optional (Port)
PORT=8001
```

## Docker Compose with .env

1. Create `backend/.env` file with your API keys
2. Run: `docker-compose up -d`

## Health Check

The container includes a health check endpoint:

```bash
curl http://localhost:8001/health
```

## Logs

```bash
# Docker Compose
docker-compose logs -f

# Docker
docker logs -f inua-breath-backend
```

## Stop

```bash
# Docker Compose
docker-compose down

# Docker
docker stop inua-breath-backend
docker rm inua-breath-backend
```

## Production Tips

1. **Use secrets management**: Don't hardcode API keys in docker-compose.yml
2. **Set restart policy**: Already set to `unless-stopped` in docker-compose.yml
3. **Resource limits**: Add to docker-compose.yml:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 2G
   ```
4. **Reverse proxy**: Use nginx/traefik in front of the container
5. **Monitoring**: Health check endpoint is available at `/health`
