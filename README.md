# 🌬️ Inua Breathing Agent

> **When you're overwhelmed, you shouldn't have to research a solution. Inua is the instant coach that knows exactly what you need.**

![Status](https://img.shields.io/badge/Status-Hackathon_MVP-blue) ![Stack](https://img.shields.io/badge/Tech-LLM_Agent-purple) ![Safety](https://img.shields.io/badge/Safety-Guarded-green)

## Why Inua?

Finding the right mindfulness technique requires research and clarity—two things you lack when you are stressed, exhausted, or unfocused.

* **The Reality:** A user navigating a sudden mood shift or late-night insomnia doesn't have the mental capacity to browse a library of 50 files to find the "right" one. They are experiencing **decision fatigue**.
* **The Solution:** Inua acts as an **instant prescription**. You don't browse; you just say "I'm furious" or "I can't sleep." The Agent handles the cognitive load, instantly selecting the safest, most effective grounding or breathing technique for that specific moment.

It uses LLMs to reason about your safety and context *before* it suggests a practice. If you tell it you're stressed, it checks *why*. If you tell it you're tired, it checks the *time*. It acts like a responsible coach, not a music player.

---

##  What makes it special?

### 1. It knows when to say "No" (Pregnancy Guardrails) 
Safety isn't an afterthought. If Inua detects pregnancy context (via profile or chat), it activates a **hard filter**.
* **The Guardrail:** It physically cannot suggest breath retention (Kumbhaka) or intense abdominal pumps.
* **The Pivot:** It automatically swaps those out for grounding, safe alternatives without breaking the flow.

### 2. It understands nuance (Semantic Detection) 
"I'm dying of laughter" and "My chest hurts" trigger very different responses.
* **Standard apps:** might offer a "Heart Healing" meditation for both.
* **Inua:** Recognizes the medical risk in the second phrase, stops the session, and triggers a safety disclaimer.

### 3. It negotiates with you (Chrono-Adaptation) 
This is our favorite feature. Inua respects your circadian rhythm (Active window: 6 AM - 8 PM).
* **Scenario:** You ask for "Intense Focus" at 2:00 AM.
* **Inua's Move:** It won't just obey. It pushes back: *"It's late, and high intensity now will ruin your sleep. Let's try 'Gentle Alertness' instead to keep you awake but calm."*

###  4. Somatic & Grounding Integration 
Inua knows that sometimes, focusing on the breath is too intense.
* **Tactile Anchoring:** Uses physical touch (e.g., "Place a hand on your heart," "Feel your feet on the floor") to ground users who are dissociating or panicked.
* **The "Panic Switch":** If the Agent detects acute distress, it abandons complex breath counts and shifts to simple, physical grounding techniques to lower cortisol immediately.
---

## 🛠️ Under the Hood

We built Inua to prove that AI can be safe if you have the right observability.

| Tech | Why we used it |
| :--- | :--- |
| **LLM Agent** | To handle the logic of "Context -> Validation -> Suggestion." |
| **Opik** | **The MVP of our stack.** We can't fix what we can't see. We use Opik to trace the agent's thought process. It lets us prove to judges (and ourselves) that the pregnancy guardrails triggered *exactly* when they were supposed to. |
| **React Native** | For a smooth mobile experience on iOS and Android. |

---

## Important Disclaimer

**Inua is a wellness tool, not a doctor.**
We built this for the hackathon to demonstrate safe AI architecture. It does not diagnose or treat medical conditions. Always consult a professional for health issues.

---

##  Getting Started

###  Try it Live (No Installation)
Want to see Inua in action right now? You can chat with the agent directly in your browser:

👉 **[Launch Live Demo](https://inuabreathagent.vercel.app/)**

*(Try asking it for a "Focus" session, or tell it you are "exhausted" to see how it adapts!)*

---

###  Run it Locally
Prefer to look under the hood? Run the full mobile simulator:

1.  **Clone the repo:**
    ```bash
    git clone [https://github.com/okanist/inuabreathagent.git](https://github.com/okanist/inuabreathagent.git)
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Launch the simulator:**
    ```bash
    npm run android
    ```
---
*Hackathon submission by Inua Team.*
---
**Built for the Commit To Change: An AI Agents Hackathon 2026, organized by Encode Club.**
