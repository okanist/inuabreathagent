# Opik Integration — InuaBreath

This document explains how Opik is integrated into InuaBreath for **tracing, evaluation, and human feedback**, and how these signals are used to improve system quality.

## Overview
We use Opik to:
- Trace end‑to‑end agent runs (request → safety guardrails → technique selection → response)
- Log metadata (model/prompt versions, user context, selected technique)
- Record evaluation scores (safety compliance, pregnancy safety, technique validity)
- Attach **human feedback** (post‑exercise “helpful/not helpful”) to the original trace

Key backend file: `backend/server.py`

## Tracing Architecture
Each `/api/agent/chat` call generates a single trace with multiple spans:

- `agent_chat_endpoint` (root)
- `request_metadata`
- `guardrail_crisis_check`
- `rag_filter_techniques`
- `llm_select_and_compose` (LLM call)

### Why this matters
This structure makes the agent’s reasoning pipeline observable, enabling:
- Debugging slow or incorrect steps
- Comparing behavior across prompt/model versions
- Attaching safety and quality metrics per request

## Metadata
We store critical context at trace level, including:
- `session_id`
- `prompt_version`
- `model_version`
- `country_code`
- `current_time`
- `pregnancy_mode`
- `selected_technique_id`
- `selected_screen_type`

This makes every trace self‑describing and easy to analyze in Opik.

## Evaluation Scores (Automated)
We attach deterministic feedback scores to each trace:

- `safety_blocked`  
  `1.0` if a crisis is detected (emergency override), else `0.0`

- `pregnancy_hold_compliance`  
  `1.0` if no breath‑holds are returned for pregnant users, else `0.0`

- `technique_id_valid`  
  `1.0` if the selected technique exists in the candidate set, else `0.0`

- `instruction_text_present`  
  `1.0` if deterministic instructions were generated, else `0.0`

- `emergency_override_present`  
  `1.0` if emergency override is returned, else `0.0`

These scores allow us to track safety compliance and correctness over time.

## Human Feedback (Post‑Exercise)
Users can rate sessions with **Yes/No** (“Did this exercise help?”).  
We attach this feedback to the original trace using `trace_id`:

- `user_helpfulness = 1.0` for “Yes”
- `user_helpfulness = 0.0` for “No”

This creates a human‑in‑the‑loop quality signal directly in Opik.

## Where It Lives in Code
Backend (Opik tracing + scores):
- `backend/server.py`

Frontend (feedback submission):
- `app/app/home.tsx`
- `app/src/services/BreathingAgentService.ts`

## How to Validate in Opik
1. Trigger a chat session.
2. Complete the exercise and submit feedback.
3. Open the trace in Opik:
   - **Feedback scores** should include automated metrics + `user_helpfulness`
   - **Metadata** should show model/prompt version and context
   - **Token usage** should appear on the LLM span

## Demo Checklist (1‑Minute Flow)
1. Start a chat session in the app.
2. Show the trace timeline with all spans.
3. Open **Metadata** tab to show prompt/model version + safety context.
4. Open **Feedback scores** to show automated safety scores.
5. Submit “Yes/No” feedback and refresh the trace.
6. Point to `user_helpfulness` now present in feedback scores.

## Mini Dataset + Experiment (Recommended)
We include a small evaluation dataset and a one‑command runner to compare prompt versions.

**Files**
- `backend/eval/mini_inua.jsonl`
- `backend/eval/run_eval_mini.py`

**How to run**
```bash
# Example: run with current prompt version
python backend/eval/run_eval_mini.py

# Compare prompt versions
set INUA_PROMPT_VERSION=v2
python backend/eval/run_eval_mini.py
set INUA_PROMPT_VERSION=v3
python backend/eval/run_eval_mini.py
```

**What you get in Opik**
- Experiment: `inua_mini_v2` vs `inua_mini_v3`
- Metrics: `safety_block_correct`, `pregnancy_hold_violation`

## Why This Matters for the Hackathon
This integration demonstrates:
- End‑to‑end observability
- Safety‑first design with measurable compliance
- Human feedback loops that improve the system over time
