# Inua - Breathing and Grounding Coach

> When you feel overwhelmed, Inua helps you find the safest, most effective technique for the moment.

![Status](https://img.shields.io/badge/Status-Hackathon_MVP-blue) ![Stack](https://img.shields.io/badge/Tech-LLM_Agent-purple) ![Safety](https://img.shields.io/badge/Safety-Guarded-green)

## Project Summary
Inua is a health, fitness, and wellness assistant that guides users through breathing and grounding practices to reduce stress, improve focus, and support sleep. The system is safety-first, with explicit guardrails for pregnancy and crisis situations. It combines deterministic safety rules, a curated technique database, and LLM-based selection to deliver the right technique at the right time.

This project was built for the Health, Fitness & Wellness track and the Best Use of Opik award.

## Why It Matters

When the brain is in **alarm mode**, it needs a **precise intervention**, not a conversation.  
**Inua** automates the path to regulation within strict biological and safety boundaries.

---

## The Problem: Cognitive Paralysis

In moments of acute stress or panic, the **prefrontal cortex** (the brain’s decision-making center) can be compromised. In this state, users can’t browse a library of exercises or evaluate options.

They need an agent that can:
- assess distress quickly,
- choose **one** safe path,
- deliver **immediate** guidance back to stability.

---

## The Solution: Autonomous Decision Engine

Inua is a dedicated wellness agent that eliminates the **choice gap** by acting as an intelligent bridge between distress and recovery.

It processes user input through a high-performance decision pipeline governed by strict:
- biological constraints,
- physical safety constraints,
- deterministic guardrails.

---

## Our Mission: Elevating Quality of Life

Inua’s objective isn’t only momentary relief — it’s **building emotional resilience** so quality of life becomes sustainable.

- **Empowering Resilience:** a “safe space” where users can manage crisis moments independently  
- **Zero-Friction Support:** technology that aligns with biological rhythms  
- **Safety as a Standard:** a safety-first engineering mindset for sensitive states (e.g., pregnancy mode, potential crises)

---

## Decision Pipeline Overview

Architecture diagram: [`docs/architecture.md`](docs/architecture.md).

Inua follows a multi-layered execution flow where **safety** and **adaptation** are deterministic:

1. **Two-Stage Safety Guardrail**
   - **Fast-Path (Keyword Filter):** zero-latency detection of high-risk language for emergency triggers
   - **Fallback (LLM Intent Classifier):** distinguishes metaphorical distress (e.g., “I’m dying of exhaustion”) from acute clinical crisis (e.g., “sharp chest pains”)

2. **Emergency Override**
   - If crisis is detected, Inua exits the normal flow and returns **help resources**.

3. **Context Injection**
   - Safe inputs are enriched with:
     - **Circadian Context** (time of day)
     - **Pregnancy Mode** (user profile)

4. **Technique Adaptation & Normalization**
   - The engine doesn’t just filter techniques — it **modifies** them:
     - removes unsafe phases (e.g., breath-holds),
     - recalculates timing and flow in real time,
     - preserves the original intent (e.g., calming down-regulation).

5. **Autonomous Execution**
   - The final intervention is delivered **only within verified boundaries**.

6. **Observability**
   - The pipeline is traceable via **Opik** for evaluation and reliability.

---

## Circadian-Aware Intelligence

Inua uses circadian rhythm as a primary decision filter:

- **Contextual Prioritization:**  
  prioritizes **Up-Regulation** (alertness/focus) during daytime and **Down-Regulation** (parasympathetic activation) at night.

- **Dynamic Focus:**  
  if a user needs focus at night, Inua selects **Calm Focus** interventions that support concentration without overstimulating the nervous system or disrupting sleep preparation.

---

## Specialized Safety: Pregnancy Mode (Adaptive Safety)

### Risk
Breathing techniques involving **Kumbhaka (breath retention)** can restrict oxygen flow and are generally discouraged during pregnancy.

### Adaptive Solution
If a technique such as **4-7-8 breathing** is selected, Inua automatically:
- strips the hold phase,
- recalculates instructions for a continuous, safe flow of breath,
- maintains the technique’s calming intent without retention.

---

## 📊 Observability & Reliability (Opik)

We use **Opik** to ensure the agent stays within defined biological and safety boundaries:

- **Guardrail Performance:** track Fast-Path triggers vs. LLM classifier usage (latency + accuracy optimization)
- **Constraint Validation:** automated scoring for pregnancy-safe compliance and “hold-phase stripping” accuracy
- **Traceable Reasoning:** visualize why a technique was chosen and how it was modified, enabling transparent evaluation of decisions

See details in [`OPIK_INTEGRATION.md`](OPIK_INTEGRATION.md).

## Demo and Installation
- Web demo: [InuaBreath Web Demo](https://inuabreathagent.vercel.app/)
- Android APK: [`Inua.apk`](Inua.apk)
- Full setup steps: [`INSTALLATION_GUIDE.md`](INSTALLATION_GUIDE.md)
- Engineering notes: [`ENGINEERING_NOTES.md`](ENGINEERING_NOTES.md)

## Tech Stack
- FastAPI backend
- React Native app (Expo)
- Opik for tracing, evaluation, and experiments
- IO Intelligence API for LLM inference

## Hackathon Alignment
- Functionality: end-to-end app flow (chat -> technique -> session -> feedback)
- Real-world relevance: stress, sleep, and wellness support
- LLM/Agent usage: safe technique selection and empathy generation
- Evaluation and observability: Opik tracing, scores, and experiments
- Safety: crisis guardrails and pregnancy-safe normalization

---
Built for the Commit To Change: AI Agents Hackathon 2026 (Encode Club)
