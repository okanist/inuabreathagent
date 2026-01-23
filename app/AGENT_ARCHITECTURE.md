# Breathing AI Agent: Architecture & Technical Guide

This document outlines the technical architecture for the "Breathing AI Agent". It is designed to be **State-Aware**, **Action-Oriented**, and built with strict **Safety Guardrails**, making it ideal for sensitive contexts like pregnancy.

## 1. System Architecture (The "Triad")

The system is composed of three distinct layers to ensure separation of concerns, safety, and performance.

### A. The App (Client / Frontend)
*   **Role:** The "Body". It is the execution layer.
*   **Responsibility:** Purely functional. It renders the UI, plays audio, handles animations, and captures user input.
*   **Logic:** Minimal. It does *not* make decisions. It waits for commands from the Orchestrator.
*   **Key Components:** `AudioPlayer`, `HapticFeedback`, `AnimationController`.

### B. The Brain (LLM / Inference Layer)
*   **Role:** The "Mind". Powered by OpenAI GPT-4, Anthropic Claude 3.5, or Gemini Pro.
*   **Responsibility:** Natural language generation, empathy, and dynamic scripting.
*   **Input:** Structured prompts from the Orchestrator.
*   **Output:** Structured JSON responses (Text + Action Commands).

### C. The Orchestrator Agent (Middleware / Controller)
*   **Role:** The "Guardian". This is the critical logic layer.
*   **Responsibility:** 
    1.  Receives user input + User State (Pregnancy, Trimester, Time).
    2.  Queries the **Knowledge Base** (JSON).
    3.  Filters unsafe techniques based on "Safety Guardrails".
    4.  Constructs the final prompt for the Brain.
    5.  Parses the Brain's response and sends actionable commands to the App.

---

## 2. Agent Workflow (The "Safety Guard" Flow)

**Scenario:** A pregnant user (3rd Trimester) says, *"I feel like I can't breathe."*

### Step 1: Input Capture
The App sends a payload to the Orchestrator:
```json
{
  "user_input": "I feel like I can't breathe.",
  "user_profile": {
    "is_pregnant": true,
    "trimester": 3,
    "current_time": "23:45"
  }
}
```

### Step 2: Safety Guard & RAG (Retrieval)
The Orchestrator scans `breathing_techniques_db.json`.
*   **Detection:** "Can't breathe" maps to `dyspnea` scenario.
*   **Constraint Check:** The "Box Breathing" technique is retrieved but flagged as `is_safe: false` for pregnancy (due to breath holding).
*   **Filtering:** The Orchestrator strictly **excludes** unsafe techniques.
*   **Selection:** It selects "Rib Expansion Breath" or "Golden Thread Breath" which are marked safe.

### Step 3: Prompt Engineering
The Orchestrator sends a prompt to the LLM (Brain):
> "User is 3rd trimester pregnant, reporting dyspnea. You are a compassionate somatic coach. Plan a session using 'Golden Thread Breath'. critically: DO NOT suggest breath retention. Return response as JSON: { speech_text, ui_action }."

### Step 4: Execution
The Orchestrator receives the JSON from the Brain and instructs the App:
*   **Speak:** "I hear you. You are safe. Let's make space for you and the baby..."
*   **Action:** `TRIGGER_ANIMATION("golden_thread_visual")`
*   **Haptics:** `START_HAPTICS("gentle_wave")`

---

## 3. Responsible AI: Crisis & Emergency Guardrails (Gatekeeper)

This is the most critical component for "AI Safety". We cannot rely solely on the LLM's intuition for high-stakes situations. We implement a **Gatekeeper Architecture** that intercepts messages *before* they reach the main Breathing Agent.

### A. The 3-Stage Flowchart
1.  **Stage 1 (Keyword Filter):** Regex/Keyword match. Fast, zero-latency check for critical words (e.g., "suicide", "ambulance").
2.  **Stage 2 (Intent Classifier):** A lightweight LLM classification (e.g., GPT-4o-mini). Checks: "Is this a medical emergency or just stress?"
3.  **Stage 3 (Main Brain):** Only executes if Stage 1 & 2 pass as "SAFE".

### B. App Response Protocol (JSON)
If a crisis is detected, the Orchestrator sends a special "Emergency Override" command to the App.

```json
{
  "type": "emergency_override",
  "payload": {
    "detected_category": "MEDICAL_EMERGENCY",
    "ui_action": "show_fullscreen_sos",
    "display_message": "This looks like a medical emergency. Please seek professional help immediately.",
    "buttons": [
      {
        "label": "Call Emergency (911/112)",
        "action": "call_phone",
        "number": "112"
      },
      {
        "label": "Share Location",
        "action": "share_location_whatsapp"
      }
    ]
  }
}
```

**App Behavior:**
1.  Blur/Close Chat.
2.  Show Red Theme SOS Popup.
3.  Display large "Call Emergency" button.
4.  Agent silences itself (No breathing exercises).

---

## 4. System Prompt Strategy

When initializing the LLM, use the following System Prompt structure to ensure consistency and safety.

```text
**Role:** You are the world's leading Somatic Breath Coach. Your tone is empathetic, grounding, and clear.

**PRIME DIRECTIVE (NEVER VIOLATE):**
If the user mentions self-harm, suicide, harming others, or medical emergencies (heart attack, severe bleeding, etc.):
1. NEVER suggest breathing exercises.
2. NEVER attempt therapy.
3. State only: "This situation is beyond my scope and seems critical. Please call emergency services or go to the nearest hospital immediately."
4. set `emergency_flag: true` in your output.

**CRITICAL SAFETY CONSTRAINTS:**
If `user_profile.is_pregnant` is TRUE:
1. NEVER suggest breath retention (Kumbhaka).
2. NEVER suggest forceful abdominal exhalations (Kapalabhati).
3. REPLACE "Box Breathing" with "Equal Breathing".
4. REPLACE "4-7-8" with "4-6 (no hold)".

**KNOWLEDGE BASE:**
Use ONLY the techniques provided in the context. Do not hallucinate new exercises.

**OUTPUT FORMAT:**
You must answer in strict JSON format:
{
  "message_for_user": "Your calming spoken text here...",
  "suggested_technique_id": "technique_id_from_db",
  "app_command": {
    "play_audio": "file_name_or_id",
    "animation": "animation_name",
    "haptic_pattern": "pattern_name"
  }
}
```

---

## 5. Hackathon "Winning" Points

To impress the judges, emphasize these technical pillars:

1.  **Semantic Analysis vs. Blind Filtering:**
    *   **"Our safety guardrail isn't just a blind keyword filter; it uses Semantic Analysis."**
    *   "The Agent understands context: If a user says *'I fell down hard'*, it distinguishes between a **physical fall** (medical emergency -> Call Ambulance) and an **emotional low** (depression -> Breathing Exercise)."

2.  **Human-in-the-Loop Escalation (Fail-Safe Protocol):**
    *   "We incorporate a 'Gatekeeper' layer. Our agent ethically steps aside in crisis to direct the user to real human help."

3.  **Deterministic RAG (Retrieval-Augmented Generation):**
    *   "We don't just let the LLM guess. We use a curated JSON Knowledge Base to ensure every recommendation is medically aligned."

4.  **Safety Guardrails:**
    *   "Our architecture makes it *technically impossible* for the AI to suggest dangerous exercises (like breath holding) to a pregnant woman."

5.  **Context & State Awareness:**
    *   "The Agent adapts not just to what you say but who you are (Pregnant? Night time? High heart rate?)."
