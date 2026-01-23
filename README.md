# InuaBreath 🌿 (Hackathon Edition)

**Empowering women with AI-guided somatic breathing.**

InuaBreath is a smart breathing companion designed to adapt to a woman's unique physiological needs, specifically focusing on **pregnancy safety** and **circadian rhythm** (Day/Night modes).

## 🚀 Key Features

- **Context-Aware AI Agent:** A backend Python agent (powered by **IO Intelligence**) that understands natural language and user context.
- **Pregnancy Safety Guard:** Automatically filters out unsafe breathing techniques (e.g., breath-holding, forceful exhalations) for pregnant users.
- **Circadian Rhythm Mode:** Adapts suggestions based on time of day (Energy for Day, Relaxation for Night).
- **Crisis Guardrail:** Detects emergency keywords ("suicide", "heart attack") and redirects users to immediate help.
- **Visual Breathing Orb:** A soothing, code-driven animation that guides users through specific breathing patterns.

## 🏗️ Architecture

- **Frontend:** React Native (Expo)
- **Backend:** Python (FastAPI) + IO Intelligence SDK
- **Database:** JSON-based Technique Knowledge Base (`app/assets/data/breathing_techniques_db.json`)

## 🛠️ Setup Instructions

To run the full application, you need to start both the Backend (Brain) and the Frontend (App).

### 1. Start the Backend (Brain)
The backend requires an API key for IO Intelligence.

👉 **[Read Backend Setup Instructions](./backend/README.md)**

### 2. Start the Frontend (App)
The app is built with Expo.

```bash
cd app
npm install
npx expo start
```

## 🧠 AI Agent Logic

The agent (`backend/server.py`) operates in three stages:
1.  **Guardrail:** Checks for crisis intent.
2.  **RAG / Filtering:** Retrieves safe techniques from the JSON DB based on `is_pregnant` and `is_night`.
3.  **Inference:** Calls the IO Intelligence LLM (`meta-llama/Llama-4-Maverick-17B`) to generate a supportive message.

---
*Built for the IO Intelligence Hackathon 2026.*
