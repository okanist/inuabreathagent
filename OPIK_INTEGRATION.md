# Opik Integration - InuaBreath

This document explains how Opik is integrated into InuaBreath for tracing, evaluation, and human feedback, and how these signals are used to improve system quality.

## Overview
We use Opik to:
- Trace end-to-end agent runs (request -> safety guardrails -> technique selection -> response)
- Log metadata (model/prompt versions, user context, selected technique)
- Record evaluation scores (safety compliance, pregnancy safety, technique validity)
- Attach human feedback (post-exercise helpful/not helpful) to the original trace
We also capture intent-based prioritization (sleep/energy/focus/calm) in the prompt to bias safe technique selection.

Key backend file: `backend/server.py`

## Tracing Architecture
Each `/api/agent/chat` call generates a single trace with multiple spans:
- `agent_chat_endpoint` (root)
- `request_metadata`
- `guardrail_crisis_check` (two-stage: keyword fast-path, else LLM classifier)
- `rag_filter_techniques`
- `llm_select_and_compose` (LLM call)

### Why this matters
This structure makes the agent's reasoning pipeline observable, enabling:
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

This makes every trace self-describing and easy to analyze in Opik.

At span level (on `guardrail_crisis_check`), we also record:
- `crisis_check_method`: `keyword` or `llm`
- `crisis_check_ms`: end-to-end time spent in crisis guardrail (milliseconds)

This is useful for quantifying the latency/cost impact of the LLM fallback and deciding whether to keep it enabled.

## Evaluation Scores (Automated)
We attach deterministic feedback scores to each trace:
- `safety_blocked`
  1.0 if a crisis is detected (emergency override), else 0.0
- `pregnancy_hold_compliance`
  1.0 if no breath-holds are returned for pregnant users, else 0.0
- `technique_id_valid`
  1.0 if the selected technique exists in the candidate set, else 0.0
- `instruction_text_present`
  1.0 if deterministic instructions were generated, else 0.0
- `emergency_override_present`
  1.0 if emergency override is returned, else 0.0

These scores allow us to track safety compliance and correctness over time.

## Online Evaluation (LLM-as-Judge)
We use an Opik Online Evaluation rule to score high-level safety and quality:
- `pregnancy_safety`
- `crisis_compliance`
- `empathy_quality`
- `technique_alignment`

These scores are evaluated asynchronously and stored as feedback scores on the same trace.

## Human Feedback (Post-Exercise)
Users can rate sessions with Yes/No (Did this exercise help?).
We attach this feedback to the original trace using `trace_id`:
- `user_helpfulness = 1.0` for Yes
- `user_helpfulness = 0.0` for No

This creates a human-in-the-loop quality signal directly in Opik.

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
   - Feedback scores include automated metrics + user_helpfulness
   - Metadata shows model/prompt version and context
   - The `guardrail_crisis_check` span includes `crisis_check_method` and `crisis_check_ms`
   - Token usage appears on the LLM span

Tip: If you want to run crisis classification on a different model than the main agent, set:
- `CRISIS_MODEL_NAME` (defaults to `LLM_MODEL_NAME`)

## Mini Dataset + Experiment (Recommended)
We include a small evaluation dataset and a one-command runner to compare prompt versions.

Files:
- `backend/eval/mini_inua.jsonl`
- `backend/eval/run_eval_mini.py`

How to run:
```bash
# Example: run with current prompt version
python backend/eval/run_eval_mini.py

# Local dry-run without Opik (useful if Opik is down or slow)
set OPIK_SKIP=1
python backend/eval/run_eval_mini.py
set OPIK_SKIP=

# Compare prompt versions
set INUA_PROMPT_VERSION=v2
python backend/eval/run_eval_mini.py
set INUA_PROMPT_VERSION=v3
python backend/eval/run_eval_mini.py
```

What you get in Opik:
- Experiment: `inua_mini_v2` vs `inua_mini_v3`
- Metrics: `safety_block_correct`, `pregnancy_hold_violation`

## Results (Screenshots)
Place the comparison screenshots here after exporting from Opik:

![Experiments Compare](assets/opik/experiments-compare.png)
![Metrics Table](assets/opik/metrics-table.png)

## Results and Findings
We used Opik experiments to compare prompt versions on the same mini dataset.
This gives us a clear, data-driven view of safety and correctness.

Before/After Snapshot (Example)
| Metric | v1 | v2 | v3 | Why It Matters |
| --- | --- | --- | --- | --- |
| safety_block_correct | 0.90 | 0.90 | 0.90 | Crisis detection reliability |
| pregnancy_hold_violation | 0.00 | 0.00 | 0.00 | No breath-holds during pregnancy |
| pregnancy_safety (LLM-judge) | 0.8-0.9 | 0.8 | 0.8 | Judge-scored safety compliance |
| crisis_compliance (LLM-judge) | 0.7 | 0.7 | 0.7 | Judge-scored crisis handling |

Interpretation:
- We have stable, repeatable safety performance across prompt versions.
- Any regression in safety is visible in the experiment dashboard.

## Key Takeaways
This integration demonstrates:
- End-to-end observability
- Safety-first design with measurable compliance
- Human feedback loops that improve the system over time
