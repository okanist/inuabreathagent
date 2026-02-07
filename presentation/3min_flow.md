# InuaBreath - 3-Minute Presentation Flow (Video)

## Goal
Deliver a crisp, memorable 3-minute overview: app intro, pain, product demo, safety contexts (day/night/pregnancy/emergency), architecture + Opik, and a clear roadmap.

## Timing & Flow (3:00 total)

### 0:00-0:15 - App Intro (What it is)
- Script:
  - "InuaBreath is a breathing and grounding coach that delivers the safest, most effective technique for the moment."
  - "It's a calm, guided experience designed to reduce stress in minutes, without decision fatigue."

### 0:15-0:35 - Purpose & Pain
- Script:
  - "When people feel overwhelmed, they don't want to research techniques - they need clear, immediate guidance they can trust."
  - "InuaBreath reduces stress, improves focus, and supports sleep with short, guided sessions."

### 0:35-1:20 - Product Demo (Screens)
- Script:
  - "This is the Onboarding screen where we capture context like time of day and pregnancy mode."
  - "Here's the Technique Selection screen - one safe option is chosen automatically."
  - "This is the Breathing Session screen with clear, timed guidance."
  - "And here's the Feedback screen that closes the loop for continuous improvement."

### 1:20-1:55 - Context & Safety (Day/Night/Pregnancy/Emergency)
- Script:
  - "Time of day changes technique choice: day favors focus or energy, night favors down-regulation."
  - "Pregnancy mode removes breath-holds automatically for safety."
  - "If a crisis is detected, the system exits the flow and shows an emergency message."

### 1:55-2:25 - Architecture + Opik
- Script:
  - "Under the hood, a FastAPI backend and React Native app power the flow."
  - "Guardrails and technique normalization make decisions deterministic and safe."
  - "With Opik enabled, each chat request is traceable end-to-end with span-level metadata."
  - "We track safety metrics automatically, attach Helpful/Not Helpful feedback to the same trace, and compare prompt versions with experiments."

### 2:25-2:50 - Roadmap (Removed)
- Note:
  - "Roadmap is intentionally removed per request."

### 2:50-3:00 - Closing & Call to Action
- Script:
  - "InuaBreath helps people find calm, fast - safely and reliably."
  - "We're looking for pilot users and partners to help us validate and expand the experience."

## Visual Tips
- Use short captions over demo footage.
- Keep audio pacing calm and steady.
- On-screen text should be minimal and readable.

## Opik Slide Copy (Revised)

### End-to-End Observability
Every request is traceable from start to finish when Opik is enabled.  
We log key context such as pregnancy mode, current time, model/prompt version, and span-level timing.

### Automated & AI-Assisted Evaluation
The system is continuously scored on deterministic safety checks (for example: crisis blocking and pregnancy hold compliance).  
We also run Opik experiments to compare prompt versions on repeatable evaluation datasets.

### Continuous Improvement Loop
After each session, users can submit Helpful / Not Helpful feedback.  
That signal is attached to the original trace, linking real user outcomes to model behavior.
