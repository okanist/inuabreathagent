# InuaBreath Backend Agent

This folder contains the Python backend for InuaBreath, powered by **IO Intelligence** and **Opik** (optional). It serves as the "brain" of the application, processing user inputs with an LLM and filtering responses based on pregnancy status and time of day.

## Prerequisites

- Python 3.8+
- `pip`

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install fastapi uvicorn openai python-dotenv iointel
   ```

## Configuration

1. Create a `.env` file in this directory:
   ```bash
   touch .env
   ```

2. Add your IO Intelligence API Key:
   ```ini
   IOINTELLIGENCE_API_KEY=your_key_here
   # Optional: Opik Tracing
   # OPIK_API_KEY=your_opik_key
   ```

## Running the Server

The server is configured to run on **Port 8001** to avoid conflicts.

```bash
python server.py
```

- **API Endpoint:** `http://localhost:8001/api/agent/chat`
- **Swagger UI:** `http://localhost:8001/docs`

## Features

- **Guardrails:** Automatically detects crisis keywords (e.g., suicide) and returns an emergency override response.
- **Context Awareness:** Filters breathing techniques based on:
  - **Pregnancy:** Excludes unsafe techniques (e.g., Kapalabhati).
  - **Time of Day:** Excludes energy-boosting techniques at night (21:00-06:00).
- **RAG:** Uses `../app/assets/data/breathing_techniques_db.json` as a knowledge base.
