# Inua - Breathing and Grounding Coach

> When you feel overwhelmed, Inua helps you find the safest, most effective technique for the moment.

![Status](https://img.shields.io/badge/Status-Hackathon_MVP-blue) ![Stack](https://img.shields.io/badge/Tech-LLM_Agent-purple) ![Safety](https://img.shields.io/badge/Safety-Guarded-green)

## Project Summary
Inua is a health, fitness, and wellness assistant that guides users through breathing and grounding practices to reduce stress, improve focus, and support sleep. The system is safety-first, with explicit guardrails for pregnancy and crisis situations. It combines deterministic safety rules, a curated technique database, and LLM-based selection to deliver the right technique at the right time.

This project was built for the Health, Fitness & Wellness track and the Best Use of Opik award.

## Why It Matters
When users are stressed or exhausted, they cannot afford decision fatigue. Inua reduces that burden by:
- Choosing a technique based on context and time of day
- Avoiding unsafe recommendations in pregnancy
- Escalating to emergency messaging for crisis inputs
- Providing clear, short guidance that is easy to follow

## Core Features
- Context-aware technique selection (time of day, pregnancy mode)
- Crisis detection with emergency override
- Deterministic safety rules and technique normalization
- Human feedback loop (helpful / not helpful)
- Opik observability: traces, metrics, and experiments

## Safety and Responsibility
Inua is a wellness tool, not a medical device.
- No diagnostic claims
- Crisis inputs trigger emergency override
- Pregnancy mode removes breath holds

For security posture and safeguards, see `SECURITY.md`.

## Opik Integration
We use Opik to measure and monitor system quality:
- Traces and spans for the full agent pipeline
- Metadata for model and prompt versions
- Automated safety metrics
- Human feedback scores
- Online evaluation rules (LLM-as-judge)
- Mini dataset experiments (prompt version comparisons)

See details in `OPIK_INTEGRATION.md`.

## Demo and Installation
- Web demo: https://inuabreathagent.vercel.app/
- Android APK: `Inua.apk`
- Full setup steps: `INSTALLATION_GUIDE.md`
 - Engineering notes: `ENGINEERING_NOTES.md`

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
