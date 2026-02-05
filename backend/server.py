import os
from dotenv import load_dotenv
load_dotenv()

import json
import uuid
import re
import time
from typing import Optional, List, Dict, Tuple
from fastapi import FastAPI, HTTPException, Body, Request, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator
from openai import OpenAI
import uvicorn
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# --- CONFIGURATION ---
app = FastAPI(title="Breathing AI Agent Backend")

# Rate Limiting Setup - Support for load balancers (X-Forwarded-For)
def get_client_ip(request: Request) -> str:
    """Get client IP considering X-Forwarded-For header for load balancers"""
    # Check X-Forwarded-For first (for load balancers/reverse proxies)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take first IP (original client IP)
        return forwarded_for.split(",")[0].strip()
    
    # Fallback to direct IP
    return get_remote_address(request)

limiter = Limiter(key_func=get_client_ip)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware - Security: Restrict origins in production
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
# In production, set ALLOWED_ORIGINS env var: "https://yourdomain.com,http://localhost:3000"
if ALLOWED_ORIGINS == ["*"]:
    print("WARNING: CORS allows all origins. Set ALLOWED_ORIGINS env var in production!", flush=True)

# Security: Credentials cannot be used with wildcard origins (2026 security standard)
# If using wildcard, disable credentials for security
if ALLOWED_ORIGINS == ["*"]:
    allow_credentials = False
    print("WARNING: Credentials disabled due to wildcard CORS origins!", flush=True)
else:
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS != ["*"] else ["*"],
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Opik Mocking
try:
    import opik
    from opik import Opik, track, opik_context
    opik_api_key = os.environ.get("OPIK_API_KEY", "").strip()
    opik_workspace = os.environ.get("OPIK_WORKSPACE", "").strip().strip('"').strip("'")
    opik_project_name = os.environ.get("OPIK_PROJECT_NAME", "InuaBreath").strip().strip('"').strip("'")
    if opik_api_key:
        opik_client = Opik(
            project_name=opik_project_name,
            workspace=opik_workspace if opik_workspace else None,
            api_key=opik_api_key
        )
        print(f"Opik enabled and initialized (project: {opik_project_name}, workspace: {opik_workspace or 'default'})", flush=True)
        OPIK_AVAILABLE = True
    else:
        raise ImportError("No Opik Key")
except Exception as e:
    print(f"Opik disabled ({type(e).__name__}: {e})", flush=True)
    opik = None
    opik_context = None
    def track(name=None):
        def decorator(func):
            return func
        return decorator
    opik_client = None
    OPIK_AVAILABLE = False

# Initialize Client
api_key = os.environ.get("IOINTELLIGENCE_API_KEY", "").strip()
print(f"DEBUG INIT: CWD = {os.getcwd()}", flush=True)
# Security: Don't log API key length in production
print(f"DEBUG INIT: API Key present? {'YES' if api_key else 'NO'}", flush=True)

client = OpenAI(
    base_url="https://api.intelligence.io.solutions/api/v1",
    api_key=api_key
)

# Environment variables for Opik evaluation
MODEL_NAME = os.environ.get("LLM_MODEL_NAME", "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8")
INUA_PROMPT_VERSION = os.environ.get("INUA_PROMPT_VERSION", "v1")
INUA_MODEL_VERSION = os.environ.get("INUA_MODEL_VERSION", MODEL_NAME)

# --- DATA MODELS ---
class UserProfile(BaseModel):
    is_pregnant: bool
    trimester: Optional[int] = Field(None, ge=1, le=3)
    current_time: str = Field(..., pattern=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
    country_code: Optional[str] = Field("TR", max_length=2, min_length=2)
    
    @field_validator('country_code')
    @classmethod
    def validate_country_code(cls, v):
        if v:
            return v.upper()
        return v

class UserRequest(BaseModel):
    user_input: str = Field(..., max_length=2000, min_length=1)
    user_profile: UserProfile
    
    @field_validator('user_input')
    @classmethod
    def validate_input(cls, v):
        """Security: Basic input validation to prevent XSS and prompt injection"""
        if not v or not v.strip():
            raise ValueError("Input cannot be empty")
        
        # Remove potential XSS attempts
        v = v.strip()
        
        # Check for suspicious patterns (XSS protection)
        xss_patterns = [
            r'<script[^>]*>',
            r'javascript:',
            r'on\w+\s*=',
            r'data:text/html',
        ]
        
        for pattern in xss_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError("Invalid input detected")
        
        # Prompt injection protection (2026 security standard)
        prompt_injection_patterns = [
            r'ignore\s+(previous|above|all)\s+instructions?',
            r'forget\s+(previous|above|all)',
            r'you\s+are\s+now',
            r'act\s+as\s+if',
            r'pretend\s+to\s+be',
            r'disregard\s+(previous|above)',
            r'override\s+(system|previous)',
        ]
        
        for pattern in prompt_injection_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError("Invalid input detected")
        
        return v

class AgentResponse(BaseModel):
    message_for_user: Optional[str] = None
    suggested_technique_id: Optional[str] = None
    suggested_technique: Optional[Dict] = None  # Full technique object (V2) - shaped with safe phases
    instruction_text: Optional[str] = None  # Deterministic instruction from DB phases (not from LLM)
    duration_seconds: Optional[int] = 180
    app_command: Optional[Dict] = None
    emergency_override: Optional[Dict] = None
    trace_id: Optional[str] = None
    # thought_process removed - only logged to Opik metadata


class FeedbackRequest(BaseModel):
    technique_id: str = Field(..., max_length=100)
    technique_title: Optional[str] = Field(None, max_length=200)
    feedback: str = Field(..., pattern=r"^(positive|negative)$")
    trace_id: Optional[str] = Field(None, max_length=100)

# ... (rest of code)

# --- LOGIC ---

# --- DATABASE LOADING (V2 Schema: all_db.json) ---
DB_PATH = os.path.join(os.path.dirname(__file__), "all_db.json")

def load_techniques_db():
    """Load V2 breathing techniques database with basic validation"""
    try:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Basic schema validation and normalization
            techniques = data.get("techniques", [])
            for tech in techniques:
                ctx = tech.get("context_rules", {}) or {}
                logic = str(ctx.get("pregnancy_logic", "SAFE")).upper()
                if logic not in {"SAFE", "BLOCK", "MODIFY"}:
                    print(
                        f"WARNING: Invalid pregnancy_logic '{logic}' for technique '{tech.get('id', '')}'. "
                        "Defaulting to BLOCK for safety.",
                        flush=True,
                    )
                    ctx["pregnancy_logic"] = "BLOCK"
                else:
                    ctx["pregnancy_logic"] = logic

                if ctx.get("pregnancy_logic") == "MODIFY" and "pregnancy_mod_phases" not in ctx:
                    print(
                        f"WARNING: pregnancy_logic=MODIFY but no pregnancy_mod_phases for '{tech.get('id', '')}'. "
                        "Defaulting to BLOCK for safety.",
                        flush=True,
                    )
                    ctx["pregnancy_logic"] = "BLOCK"

                pregnancy_safe = ctx.get("pregnancy_safe")
                if isinstance(pregnancy_safe, bool):
                    if ctx.get("pregnancy_logic") == "BLOCK" and pregnancy_safe:
                        print(
                            f"WARNING: pregnancy_safe=true but pregnancy_logic=BLOCK for '{tech.get('id', '')}'.",
                            flush=True,
                        )
                    if ctx.get("pregnancy_logic") in {"SAFE", "MODIFY"} and not pregnancy_safe:
                        print(
                            f"WARNING: pregnancy_safe=false but pregnancy_logic={ctx.get('pregnancy_logic')} for '{tech.get('id', '')}'.",
                            flush=True,
                        )
                tech["context_rules"] = ctx
            data["techniques"] = techniques
            return data
    except Exception as e:
        print(f"Error loading DB: {e}", flush=True)
        return {"meta_info": {}, "techniques": []}

DB = load_techniques_db()

# --- PREGNANCY NORMALIZATION ---

def normalize_technique_for_profile(tech: dict, user_profile: dict) -> Optional[Dict]:
    """
    Normalize a technique based on user profile (pregnancy logic).
    Returns None if technique should be blocked, otherwise returns shaped technique.
    """
    ctx = tech.get("context_rules", {}) or {}
    is_pregnant = bool(user_profile.get("is_pregnant"))

    if not is_pregnant:
        tech2 = dict(tech)
        tech2["effective_context"] = {"pregnancy_logic": (ctx.get("pregnancy_logic") or "SAFE")}
        return tech2

    logic = (ctx.get("pregnancy_logic") or "SAFE").upper()

    if logic == "BLOCK":
        return None

    if logic == "MODIFY":
        mod = ctx.get("pregnancy_mod_phases") or {}
        shaped = dict(tech)
        phases = dict(shaped.get("phases") or {})
        shaped["phases"] = {
            "inhale_sec": int(mod.get("inhale_sec", phases.get("inhale_sec", 4))),
            "hold_in_sec": int(mod.get("hold_in_sec", 0)),  # Always 0 for pregnancy
            "exhale_sec": int(mod.get("exhale_sec", phases.get("exhale_sec", 4))),
            "hold_out_sec": int(mod.get("hold_out_sec", 0)),  # Always 0 for pregnancy
        }
        shaped["effective_context"] = {"pregnancy_logic": "MODIFY_APPLIED"}
        return shaped

    # SAFE (or any other non-blocking) - enforce no breath holds for pregnancy
    shaped = dict(tech)
    phases = dict(shaped.get("phases") or {})
    shaped["phases"] = {
        "inhale_sec": int(phases.get("inhale_sec", 4)),
        "hold_in_sec": 0,
        "exhale_sec": int(phases.get("exhale_sec", 4)),
        "hold_out_sec": 0,
    }
    shaped["effective_context"] = {"pregnancy_logic": "SAFE"}
    return shaped


def build_candidate_techniques(user_profile: dict, techniques: list[dict]) -> list[dict]:
    """
    Build candidate techniques list by normalizing each technique for the user profile.
    BLOCK techniques are excluded, MODIFY techniques have phases overridden.
    """
    shaped = []
    for t in techniques:
        t2 = normalize_technique_for_profile(t, user_profile)
        if t2 is not None:
            shaped.append(t2)
    return shaped


def sanitize_user_input_for_llm(user_input: str) -> str:
    """
    Sanitize user input before sending to LLM to prevent prompt injection.
    Security: 2026 standard - prompt injection protection.
    """
    # Remove common prompt injection patterns
    injection_patterns = [
        r'ignore\s+(previous|above|all)\s+instructions?',
        r'forget\s+(previous|above|all)',
        r'you\s+are\s+now',
        r'act\s+as\s+if',
        r'pretend\s+to\s+be',
        r'disregard\s+(previous|above)',
        r'override\s+(system|previous)',
    ]
    
    sanitized = user_input
    for pattern in injection_patterns:
        sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
    
    # Limit length to prevent prompt injection via long inputs
    sanitized = sanitized[:1500]  # Max 1500 chars
    
    return sanitized.strip()

def build_instruction_text(tech: dict) -> str:
    """
    Build deterministic instruction text from technique phases.
    This ensures consistency and safety (especially for pregnancy mode where holds are 0).
    LLM does NOT generate this - it comes from the vetted DB.
    """
    phases = tech.get("phases", {})
    inhale = int(phases.get("inhale_sec", 4))
    hold_in = int(phases.get("hold_in_sec", 0) or 0)
    exhale = int(phases.get("exhale_sec", 4))
    hold_out = int(phases.get("hold_out_sec", 0) or 0)
    
    steps = []
    steps.append(f"Inhale through your nose for {inhale} second{'s' if inhale != 1 else ''}.")
    
    if hold_in > 0:
        steps.append(f"Gently hold for {hold_in} second{'s' if hold_in != 1 else ''}.")
    
    steps.append(f"Exhale slowly through your mouth for {exhale} second{'s' if exhale != 1 else ''}.")
    
    if hold_out > 0:
        steps.append(f"Pause for {hold_out} second{'s' if hold_out != 1 else ''} before the next breath.")
    
    return " ".join(steps)

# --- LOGGING UTILS ---
LOG_FILE = "server_debug.log"

def log_debug(message: str):
    """Writes message to both console and file"""
    print(message, flush=True)
    try:
        # Basic log rotation to prevent unbounded growth (5MB max)
        if os.path.exists(LOG_FILE) and os.path.getsize(LOG_FILE) > 5 * 1024 * 1024:
            rotated = LOG_FILE + ".1"
            if os.path.exists(rotated):
                os.remove(rotated)
            os.rename(LOG_FILE, rotated)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(message + "\n")
    except Exception as e:
        print(f"Log Error: {e}")

def get_opik_trace_id() -> Optional[str]:
    """Safely retrieve current Opik trace id, if available."""
    if not (OPIK_AVAILABLE and opik and opik_context):
        return None
    try:
        trace_data = opik_context.get_current_trace_data()
        return getattr(trace_data, "id", None)
    except Exception as e:
        log_debug(f"Opik trace id error: {e}")
        return None

def opik_update_current_trace(*, name: Optional[str] = None, input: Optional[dict] = None, output: Optional[dict] = None, metadata: Optional[dict] = None, tags: Optional[list] = None, feedback_scores: Optional[list] = None, thread_id: Optional[str] = None):
    """Safely update Opik current trace with metadata/tags/feedback scores."""
    if not (OPIK_AVAILABLE and opik and opik_context):
        return
    try:
        opik_context.update_current_trace(
            name=name or None,
            input=input or None,
            output=output or None,
            metadata=metadata or None,
            tags=tags or None,
            feedback_scores=feedback_scores or None,
            thread_id=thread_id or None
        )
    except Exception as e:
        log_debug(f"Opik trace update error: {e}")

def opik_update_current_span(**kwargs):
    """Safely update Opik current span with metadata/feedback scores."""
    if not (OPIK_AVAILABLE and opik and opik_context):
        return
    try:
        opik_context.update_current_span(**kwargs)
    except Exception as e:
        log_debug(f"Opik span update error: {e}")


@track(name="rag_filter_techniques")
def get_safe_techniques(profile: UserProfile) -> Tuple[List[Dict], str]:
    """
    Filter and normalize techniques based on V2 context_rules:
    - time_of_day: ["day"], ["night"], or ["any"]
    - pregnancy_logic: "SAFE", "BLOCK", or "MODIFY"
    
    Returns:
        - candidates: List of shaped technique dicts (BLOCK excluded, MODIFY phases applied)
        - techniques_str: Formatted string for LLM prompt
    """
    log_debug("DEBUG: Filtering techniques (V2 Schema)...")
    
    # Parse Time
    try:
        hour = int(profile.current_time.split(":")[0])
    except:
        hour = 12
    
    is_night = hour >= 21 or hour < 6
    time_period = "night" if is_night else "day"
    log_debug(f"DEBUG: Hour={hour}, Period={time_period}, Pregnant={profile.is_pregnant}")
    
    # Convert profile to dict for normalization
    profile_dict = {
        "is_pregnant": profile.is_pregnant,
        "trimester": profile.trimester,
        "current_time": profile.current_time,
        "country_code": profile.country_code
    }
    
    all_techniques = DB.get("techniques", [])
    
    # First filter by time of day
    time_filtered = []
    for tech in all_techniques:
        context = tech.get("context_rules", {})
        allowed_times = context.get("time_of_day", ["any"])
        if time_period in allowed_times or "any" in allowed_times:
            time_filtered.append(tech)
    
    # Then normalize for pregnancy (BLOCK excluded, MODIFY phases applied)
    candidates = build_candidate_techniques(profile_dict, time_filtered)
    
    # Build formatted string for LLM
    safe_list = []
    for tech in candidates:
        tech_id = tech.get("id", "")
        title = tech.get("title", "")
        agent_config = tech.get("agent_config", {})
        phases = tech.get("phases", {})
        
        # Build instruction from actual phases (already normalized)
        inhale = phases.get("inhale_sec", 4)
        hold_in = phases.get("hold_in_sec", 0)
        exhale = phases.get("exhale_sec", 4)
        hold_out = phases.get("hold_out_sec", 0)
        
        if hold_in > 0 or hold_out > 0:
            instruction_text = f"Inhale {inhale}s, Hold {hold_in}s, Exhale {exhale}s, Hold {hold_out}s"
        else:
            instruction_text = f"Inhale {inhale}s, Exhale {exhale}s (no holding)"
        
        entry = (
            f"- ID: {tech_id} | Name: {title}\n"
            f"  Purpose: {agent_config.get('purpose', 'General relaxation')}\n"
            f"  Instruction: {instruction_text}"
        )
        safe_list.append(entry)
    
    techniques_str = "\n".join(safe_list)
    log_debug(f"DEBUG: Final Safe List ({len(candidates)} candidates):\n{techniques_str}")
    return candidates, techniques_str

CRISIS_MODEL_NAME = os.environ.get("CRISIS_MODEL_NAME", "").strip() or INUA_MODEL_VERSION

# NOTE: Per product decision (Feb 2026): keyword layer is English-only.
# The LLM classifier below is responsible for intent understanding.
SUICIDE_KEYWORDS_EN = [
    "suicide",
    "kill myself",
    "end my life",
    "i want to kill myself",
    "i'm going to kill myself",
    "self harm",
    "self-harm",
]

# Keep this list focused on *unambiguous red-flag* symptoms/requests to reduce false positives.
MEDICAL_EMERGENCY_KEYWORDS_EN = [
    "heart attack",
    "chest pain",
    "tightness in chest",
    "not breathing",
    "left arm numb",
    "left arm is numb",
    "left arm numbness",
    "stroke",
    "seizure",
    "unconscious",
    "severe bleeding",
    "choking",
    "ambulance",
    "call 911",
    "911",
    "emergency",
]

def _basic_crisis_keyword_check(user_input: str) -> Optional[Dict]:
    """Fast keyword-based crisis detection (English-only)."""
    lower = user_input.lower()
    if any(k in lower for k in SUICIDE_KEYWORDS_EN):
        return {"is_crisis": True, "category": "SUICIDE"}
    if any(k in lower for k in MEDICAL_EMERGENCY_KEYWORDS_EN):
        return {"is_crisis": True, "category": "MEDICAL_EMERGENCY"}
    return None

def _extract_first_json_object(text: str) -> Optional[dict]:
    """Extract the first JSON object from text, or return None."""
    if not text:
        return None
    cleaned = text.replace("```json", "").replace("```", "").strip()
    decoder = json.JSONDecoder()
    for i, ch in enumerate(cleaned):
        if ch == "{":
            try:
                obj, _end = decoder.raw_decode(cleaned[i:])
                if isinstance(obj, dict):
                    return obj
            except Exception:
                continue
    return None

def _llm_crisis_check(user_input: str) -> Dict:
    """LLM-based crisis intent classification with strict JSON output."""
    sanitized_input = sanitize_user_input_for_llm(user_input)
    system_prompt = (
        "You are a safety classifier for a wellness app. "
        "Classify whether the user message indicates a crisis requiring emergency help. "
        "Return ONLY JSON in this schema:\n"
        "{ \"is_crisis\": true|false, \"category\": \"SUICIDE\"|\"MEDICAL_EMERGENCY\"|\"NONE\" }\n"
        "Rules:\n"
        "- SUICIDE if self-harm/suicidal intent is present.\n"
        "- MEDICAL_EMERGENCY if severe physical symptoms suggest urgent medical danger "
        "(e.g., chest pain, can't breathe, left arm numbness, heart attack, stroke, severe bleeding).\n"
        "- NONE if not a crisis.\n"
        "- Treat figurative language as NONE (e.g., 'I'm dying of laughter', 'this workload is killing me').\n"
        "- If the user reports chest pain + arm numbness, or can't breathe, or signs of stroke/seizure/unconsciousness: MEDICAL_EMERGENCY.\n"
        "- If unsure but there are red-flag physical symptoms, choose MEDICAL_EMERGENCY."
    )
    try:
        response_obj = client.chat.completions.create(
            model=CRISIS_MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": sanitized_input}
            ],
            temperature=0.0
        )
        content = response_obj.choices[0].message.content
        parsed = _extract_first_json_object(content or "")
        if not parsed:
            return {"is_crisis": False, "category": "NONE"}
        is_crisis = bool(parsed.get("is_crisis", False))
        category = str(parsed.get("category", "NONE")).upper().strip()
        if category not in {"SUICIDE", "MEDICAL_EMERGENCY", "NONE"}:
            category = "NONE"
        if is_crisis and category == "NONE":
            category = "MEDICAL_EMERGENCY"
        return {"is_crisis": is_crisis, "category": category}
    except Exception as e:
        log_debug(f"LLM crisis check failed: {type(e).__name__}")
        return {"is_crisis": False, "category": "NONE"}

@track(name="guardrail_crisis_check")
def check_crisis_intent(user_input: str):
    """Check for crisis keywords in user input, then fall back to LLM classifier."""
    t0 = time.perf_counter()
    keyword_hit = _basic_crisis_keyword_check(user_input)
    if keyword_hit:
        dt_ms = (time.perf_counter() - t0) * 1000.0
        if OPIK_AVAILABLE and opik:
            opik_update_current_span(metadata={"crisis_check_method": "keyword", "crisis_check_ms": round(dt_ms, 2)})
        return keyword_hit

    out = _llm_crisis_check(user_input)
    dt_ms = (time.perf_counter() - t0) * 1000.0
    if OPIK_AVAILABLE and opik:
        opik_update_current_span(metadata={"crisis_check_method": "llm", "crisis_check_ms": round(dt_ms, 2)})
    return out

def generate_response(request: UserRequest):
    """
    Generate agent response with Opik tracing.
    Returns response without thought_process (only logged to Opik metadata).
    """
    # Security: Don't log user input directly (privacy/GDPR)
    log_debug(f"DEBUG: Processing request (input length: {len(request.user_input)} chars)")
    
    # A. Guardrail
    intent = check_crisis_intent(request.user_input)
    if intent["is_crisis"]:
        log_debug("DEBUG: Crisis Detected!")
        if intent["category"] == "SUICIDE":
            display_message = "You are not alone. Please seek professional help immediately."
        else:
            display_message = "This may be a medical emergency. Please seek urgent help immediately."
        trace_id = get_opik_trace_id()
        opik_update_current_trace(
            metadata={
                "crisis_detected": True,
                "crisis_category": intent["category"]
            },
            tags=["crisis", intent["category"].lower()],
            feedback_scores=[
                {
                    "name": "safety_blocked",
                    "value": 1.0,
                    "reason": "Crisis detected; emergency override returned."
                },
                {
                    "name": "emergency_override_present",
                    "value": 1.0,
                    "reason": "Emergency override returned."
                }
            ]
        )
        opik_update_current_trace(
            output={
                "emergency_override": True,
                "detected_category": intent["category"],
                "display_message": display_message
            }
        )
        return {
            "emergency_override": {
                "detected_category": intent["category"],
                "ui_action": "show_fullscreen_sos",
                "display_message": display_message,
                "buttons": []
            },
            "trace_id": trace_id
        }

    # B. RAG - Get shaped candidates
    candidates, techniques_str = get_safe_techniques(request.user_profile)
    
    if not candidates:
        return {"message_for_user": "I'm here to help you relax.", "duration_seconds": 180}
    
    # C. LLM Inference with Opik tracing
    log_debug(f"DEBUG: Calling LLM ({INUA_MODEL_VERSION}) with {len(candidates)} candidates...")
    
    # Build prompt based on version
    if INUA_PROMPT_VERSION == "v3":
        # v3 final prompt
        system_prompt = f"""You are Inua, a calm, empathetic, and safety-first Somatic Breath Coach.

Your role is to SELECT the single most appropriate breathing technique
from the provided list, based on the user's current emotional state and context.
You are NOT a medical professional and you must avoid medical claims.

USER CONTEXT:
- Pregnant: {request.user_profile.is_pregnant}
- Time: {request.user_profile.current_time}

SAFETY RULES (STRICT):
- If Pregnant = true:
  - You MUST NOT select any technique with pregnancy_logic = BLOCK.
  - You MUST select ONLY techniques marked SAFE or MODIFY_APPLIED.
  - All breath-hold phases have already been removed in the provided techniques.
- Do NOT encourage breath holding, strain, or discomfort.
- If no technique clearly matches, choose the most calming SAFE option.

AVAILABLE TECHNIQUES (Already safety-filtered):
{techniques_str}

INSTRUCTIONS:
1. Infer the user's PRIMARY state as ONE label:
   anxiety | insomnia | stress | low_energy | overwhelm | unknown
2. Select ONE technique_id strictly from the list above.
   - Do NOT invent techniques.
   - Do NOT modify technique IDs.
3. Write a short, warm empathy_line validating the user's feeling.
4. Write a short, non-medical reason_line explaining why this technique fits.
5. Do NOT describe how to perform the breathing technique.
   (Instructions are handled separately by the system.)

OUTPUT FORMAT (JSON ONLY):
Return ONLY the raw JSON object.
No markdown. No extra text. No explanations outside JSON.

{{
  "technique_id": "exact_id_from_list",
  "emotion_label": "anxiety | insomnia | stress | low_energy | overwhelm | unknown",
  "empathy_line": "One short, warm sentence validating their feeling.",
  "reason_line": "One short sentence explaining why this technique helps.",
  "selection_rationale": "Max 120 characters. Plain language. Why this technique was chosen."
}}"""
    elif INUA_PROMPT_VERSION == "v2":
        pregnancy_note = ""
        if request.user_profile.is_pregnant:
            pregnancy_note = "\n\nCRITICAL PREGNANCY RULES:\n- You MUST NOT choose techniques where pregnancy_logic is BLOCK.\n- Prefer SAFE or MODIFY_APPLIED techniques only.\n- When pregnant, hold phases must be 0 (already applied in candidate list)."
        
        system_prompt = f"""You are 'Inua', an expert Somatic Breath Coach.
Analyze the user's emotional state and select the BEST matching breathing technique ID from the available list.

### USER CONTEXT
- Pregnant: {request.user_profile.is_pregnant}
- Time: {request.user_profile.current_time}
{pregnancy_note}

### AVAILABLE TECHNIQUES
{techniques_str}

### INSTRUCTIONS
1. Analyze the user's input.
2. Select one technique ID from the list above.
3. Generate a JSON response.
4. Do NOT describe how to perform the technique (breathing instructions are generated automatically from the database).

### OUTPUT FORMAT (JSON ONLY)
Return ONLY the raw JSON object. Do not wrap in markdown code blocks. Do not add conversational text.

{{
  "technique_id": "exact_id_from_list",
  "empathy_line": "A warm, short sentence validating their feeling.",
  "reason_line": "A short 1-sentence explanation of why this technique helps."
}}"""
    else:
        # v1 prompt
        system_prompt = f"""You are 'Inua', an expert Somatic Breath Coach.
Analyze the user's emotional state and select the BEST matching breathing technique ID from the available list.

### USER CONTEXT
- Pregnant: {request.user_profile.is_pregnant} (CRITICAL: If true, NO BREATH HOLDING allowed)
- Time: {request.user_profile.current_time}

### AVAILABLE TECHNIQUES
{techniques_str}

### INSTRUCTIONS
1. Analyze the user's input.
2. Select one technique ID.
3. Generate a JSON response.
4. Do NOT describe how to perform the technique (breathing instructions are generated automatically from the database).

### OUTPUT FORMAT (JSON ONLY)
Return ONLY the raw JSON object. Do not wrap in markdown code blocks. Do not add conversational text.

{{
  "technique_id": "exact_id_from_list",
  "empathy_line": "A warm, short sentence validating their feeling.",
  "reason_line": "A short 1-sentence explanation of why this technique helps."
}}"""
    
    # LLM call with Opik span
    # Security: Sanitize user input before sending to LLM
    sanitized_input = sanitize_user_input_for_llm(request.user_input)
    selection_note = ""
    try:
        if OPIK_AVAILABLE and opik:
            try:
                with opik.start_as_current_span(
                    name="llm_select_and_compose",
                    type="llm",
                    metadata={
                        "model": INUA_MODEL_VERSION,
                        "prompt_version": INUA_PROMPT_VERSION,
                        "candidate_count": len(candidates)
                    },
                    input={"user_input_preview": sanitized_input[:200], "candidate_count": len(candidates)},
                ):
                    response_obj = client.chat.completions.create(
                        model=INUA_MODEL_VERSION,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": sanitized_input}
                        ],
                        temperature=0.3
                    )
                    content = response_obj.choices[0].message.content
                    usage = getattr(response_obj, "usage", None)
                    if usage:
                        opik_update_current_span(
                            metadata={"model_version": INUA_MODEL_VERSION, "temperature": 0.3},
                            usage={
                                "prompt_tokens": getattr(usage, "prompt_tokens", None),
                                "completion_tokens": getattr(usage, "completion_tokens", None),
                                "total_tokens": getattr(usage, "total_tokens", None),
                            }
                        )
            except Exception as e:
                log_debug(f"Opik span error (llm_select_and_compose): {e}")
                response_obj = client.chat.completions.create(
                    model=INUA_MODEL_VERSION,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": sanitized_input}
                    ],
                    temperature=0.3
                )
                content = response_obj.choices[0].message.content
                usage = getattr(response_obj, "usage", None)
                if usage:
                    opik_update_current_span(
                        metadata={"model_version": INUA_MODEL_VERSION, "temperature": 0.3},
                        usage={
                            "prompt_tokens": getattr(usage, "prompt_tokens", None),
                            "completion_tokens": getattr(usage, "completion_tokens", None),
                            "total_tokens": getattr(usage, "total_tokens", None),
                        }
                    )
        else:
            # Security: Sanitize user input before sending to LLM
            sanitized_input = sanitize_user_input_for_llm(request.user_input)
            response_obj = client.chat.completions.create(
                model=INUA_MODEL_VERSION,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": sanitized_input}
                ],
                temperature=0.3
            )
            content = response_obj.choices[0].message.content
        
        log_debug("DEBUG: LLM Response Received.")
        # Security: Don't log raw LLM response (may contain sensitive data)
        log_debug(f"DEBUG: LLM Response length: {len(content) if content else 0} chars")
        
        # Parse JSON with security validation
        import re
        def _extract_json_object(text: str) -> Optional[str]:
            """Extract the first JSON object from text, or return None."""
            if not text:
                return None
            cleaned = text.replace("```json", "").replace("```", "").strip()
            # Fast path: whole string is JSON
            try:
                json.loads(cleaned)
                return cleaned
            except Exception:
                pass
            decoder = json.JSONDecoder()
            for i, ch in enumerate(cleaned):
                if ch == "{":
                    try:
                        obj, _end = decoder.raw_decode(cleaned[i:])
                        return json.dumps(obj)
                    except Exception:
                        continue
            return None

        extracted = _extract_json_object(content)
        if extracted:
            content = extracted
        
        # Security: Safe JSON parsing with whitelist validation
        try:
            llm_output = json.loads(content)
            # Whitelist validation - only allow expected keys
            allowed_keys = {
                "technique_id", "empathy_line", "reason_line", 
                "emotion_label", "selection_rationale"
            }
            # Filter to only allowed keys and ensure values are strings
            llm_output = {
                k: str(v)[:500] if isinstance(v, str) else str(v)[:500] 
                for k, v in llm_output.items() 
                if k in allowed_keys and isinstance(v, (str, int, float, type(None)))
            }
        except (json.JSONDecodeError, TypeError, ValueError) as e:
            log_debug(f"JSON ERROR: Failed to parse LLM response: {type(e).__name__}")
            return {"message_for_user": "I'm having trouble processing your request. Please try again.", "suggested_technique_id": None, "duration_seconds": 180}
        tech_id = llm_output.get("technique_id", "equal_breathing")
        empathy = llm_output.get("empathy_line", "I'm here to help you feel better.")
        reason = llm_output.get("reason_line", "This breathing technique will help you relax.")
        
        # v3 fields (optional, for backward compatibility)
        emotion_label = llm_output.get("emotion_label", None)
        selection_rationale = llm_output.get("selection_rationale", None)
        
        # Build selection note for Opik (not returned to user)
        if INUA_PROMPT_VERSION == "v3" and selection_rationale:
            selection_note = f"Selected {tech_id} (emotion: {emotion_label or 'unknown'}): {selection_rationale}"
        else:
            selection_note = f"Selected {tech_id}: {reason}"
        
        # Find technique in candidates (already shaped)
        found_tech = None
        for tech in candidates:
            if tech.get("id") == tech_id:
                found_tech = tech
                break
        
        # Fallback
        if not found_tech:
            for tech in candidates:
                if tech.get("id") == "equal_breathing":
                    found_tech = tech
                    tech_id = "equal_breathing"
                    break
        
        if not found_tech and candidates:
            found_tech = candidates[0]
            tech_id = found_tech.get("id", "equal_breathing")
        
        if found_tech:
            title = found_tech.get("title", "Breathing Exercise")
            phases = found_tech.get("phases", {})
            duration = found_tech.get("default_duration_sec", 180)
            
            # Chat instructions:
            # If pregnant, always build from phases (holds already removed).
            if request.user_profile.is_pregnant:
                instruction_text = build_instruction_text(found_tech)
            else:
                instruction_text = (found_tech.get("agent_config") or {}).get("instruction_clue") or build_instruction_text(found_tech)
            
            # Message without instruction (LLM only provides empathy and reason)
            message = f"{empathy} {reason}"
            
            # Log selection note to Opik span metadata if available
            if OPIK_AVAILABLE and opik:
                try:
                    meta = {"selection_note": selection_note[:500]}
                    if INUA_PROMPT_VERSION == "v3":
                        if emotion_label:
                            meta["emotion_label"] = emotion_label
                        if selection_rationale:
                            meta["selection_rationale"] = selection_rationale[:200]
                    opik_update_current_span(metadata=meta)
                except Exception as e:
                    log_debug(f"Opik metadata update error: {e}")
            
            result = {
                "message_for_user": message,
                "suggested_technique_id": tech_id,
                "instruction_text": instruction_text,  # Deterministic from DB, not LLM
                "duration_seconds": duration,
                "suggested_technique": {
                    "id": tech_id,
                    "title": title,
                    "category": found_tech.get("category", ""),
                    "screen_type": found_tech.get("screen_type", "breathing"),
                    "phases": phases,  # Already normalized (safe for pregnancy)
                    "ui_texts": found_tech.get("ui_texts", {}),
                    "default_duration_sec": duration
                },
                "trace_id": get_opik_trace_id()
            }
            
            # Duration adjustments
            user_input_lower = request.user_input.lower()
            if "sleep" in user_input_lower or "insomnia" in user_input_lower:
                result["duration_seconds"] = max(duration, 240)

            # Opik trace-level feedback scores (deterministic checks)
            if request.user_profile.is_pregnant:
                hold_in = int(phases.get("hold_in_sec", 0) or 0)
                hold_out = int(phases.get("hold_out_sec", 0) or 0)
                pregnancy_hold_ok = 1.0 if (hold_in == 0 and hold_out == 0) else 0.0
            else:
                pregnancy_hold_ok = 1.0

            opik_update_current_trace(
                metadata={
                    "selected_technique_id": tech_id,
                    "selected_screen_type": found_tech.get("screen_type", "breathing"),
                    "pregnancy_mode": bool(request.user_profile.is_pregnant)
                },
                tags=["chat", "agent", f"prompt_{INUA_PROMPT_VERSION}"],
                feedback_scores=[
                    {
                        "name": "safety_blocked",
                        "value": 0.0,
                        "reason": "No crisis detected; normal response."
                    },
                    {
                        "name": "emergency_override_present",
                        "value": 0.0,
                        "reason": "No emergency override in normal flow."
                    },
                    {
                        "name": "pregnancy_hold_compliance",
                        "value": pregnancy_hold_ok,
                        "reason": "No breath holds when pregnant." if pregnancy_hold_ok == 1.0 else "Breath holds present during pregnancy."
                    },
                    {
                        "name": "technique_id_valid",
                        "value": 1.0 if found_tech else 0.0,
                        "reason": "Technique ID resolved from candidate set."
                    },
                    {
                        "name": "instruction_text_present",
                        "value": 1.0 if instruction_text else 0.0,
                        "reason": "Instruction text returned from DB-derived phases." if instruction_text else "Instruction text missing."
                    }
                ]
            )
            opik_update_current_trace(
                output={
                    "suggested_technique_id": tech_id,
                    "message_for_user": message,
                    "duration_seconds": result.get("duration_seconds"),
                    "screen_type": found_tech.get("screen_type", "breathing"),
                    "emergency_override": False
                }
            )

            log_debug(f"FINAL RESULT: {result}")
            return result
        else:
            return {"message_for_user": "Let me help you relax.", "duration_seconds": 180}
            
    except json.JSONDecodeError:
        # Security: Don't log JSON content (may contain sensitive data)
        log_debug("JSON ERROR: Failed to parse LLM response")
        return {"message_for_user": "I'm having trouble processing your request. Please try again.", "suggested_technique_id": None, "duration_seconds": 180}
    except Exception as e:
        import traceback
        # Security: Log full error details but don't expose to user
        log_debug(f"LLM ERROR: {e}")
        log_debug(f"TRACEBACK: {traceback.format_exc()}")
        # Return generic error message to user (no sensitive info)
        return {"message_for_user": "I'm having trouble processing your request. Please try again."}

# --- API AUTHENTICATION ---
# API Key Authentication (optional - set API_AUTH_REQUIRED=true to enable)
API_AUTH_REQUIRED = os.environ.get("API_AUTH_REQUIRED", "false").lower() == "true"
API_AUTH_KEY = os.environ.get("API_AUTH_KEY", "").strip()

security = HTTPBearer(auto_error=False)

async def verify_api_key(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Verify API key if authentication is enabled"""
    if not API_AUTH_REQUIRED:
        return True
    
    if not credentials:
        raise HTTPException(status_code=401, detail="API key required")
    
    if credentials.credentials != API_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    
    return True

# --- API ENDPOINTS ---

@app.get("/health")
@limiter.limit("60/minute")  # Rate limiting for health endpoint (2026 security)
def health_check(request: Request):  # Request parameter required by slowapi for rate limiting (IP detection)
    """Health check endpoint for Docker/load balancers"""
    # Note: 'request' parameter is required by @limiter.limit() decorator but not used in function body
    return {"status": "healthy", "service": "inua-breath-backend"}

@app.get("/api/breathing/techniques")
@limiter.limit("30/minute")  # Rate limiting: 30 requests per minute per IP
def get_techniques_endpoint(request: Request, is_pregnant: bool = False, is_night: bool = False):  # Request parameter required by slowapi for rate limiting (IP detection)
    """
    Returns filtered techniques based on user context.
    Applies V2 context_rules (time_of_day, pregnancy_logic).
    For MODIFY techniques, returns pregnancy_mod_phases if pregnant.
    """
    log_debug(f"DEBUG: GET /api/breathing/techniques - pregnant={is_pregnant}, night={is_night}")
    
    time_period = "night" if is_night else "day"
    result = []
    
    for tech in DB.get("techniques", []):
        context = tech.get("context_rules", {})
        
        # Time filter
        allowed_times = context.get("time_of_day", ["any"])
        if time_period not in allowed_times and "any" not in allowed_times:
            continue
        
        # Pregnancy filter
        tech_copy = tech.copy()
        if is_pregnant:
            pregnancy_logic = str(context.get("pregnancy_logic", "SAFE")).upper()
            
            if pregnancy_logic == "BLOCK":
                continue
            elif pregnancy_logic == "MODIFY":
                # Replace phases with modified phases
                if "pregnancy_mod_phases" in context:
                    tech_copy["phases"] = context["pregnancy_mod_phases"]
            else:
                phases = dict(tech_copy.get("phases") or {})
                tech_copy["phases"] = {
                    "inhale_sec": int(phases.get("inhale_sec", 4)),
                    "hold_in_sec": 0,
                    "exhale_sec": int(phases.get("exhale_sec", 4)),
                    "hold_out_sec": 0,
                }
        
        result.append(tech_copy)
    
    return {"techniques": result}


@app.post("/api/feedback")
@limiter.limit("30/minute")
def feedback_endpoint(request: Request, body: FeedbackRequest):
    """Log exercise feedback (helpful / not helpful) for Opik tracking."""
    try:
        if OPIK_AVAILABLE and opik:
            # If we have a trace_id, log a feedback score to that trace (no new trace/span)
            if body.trace_id and opik_client:
                score_value = 1.0 if body.feedback == "positive" else 0.0
                try:
                    opik_client.log_traces_feedback_scores([
                        {
                            "id": body.trace_id,
                            "name": "user_helpfulness",
                            "value": score_value,
                            "reason": "User marked exercise as helpful." if score_value == 1.0 else "User marked exercise as not helpful."
                        }
                    ])
                except Exception as e:
                    log_debug(f"Opik trace feedback log error: {e}")
        log_debug(f"Feedback: technique_id={body.technique_id} feedback={body.feedback}")
    except Exception as e:
        log_debug(f"Opik feedback log error: {e}")
    return {"ok": True}


@app.post("/api/agent/chat", response_model=AgentResponse)
@limiter.limit("10/minute")  # Rate limiting: 10 requests per minute per IP
@track(name="agent_chat_endpoint")
def chat_endpoint(request: Request, user_request: UserRequest, _: bool = Depends(verify_api_key)):  # Request parameter required by slowapi for rate limiting (IP detection)
    log_debug("DEBUG: Endpoint hit")
    
    # Generate session ID and set request metadata in Opik
    session_id = str(uuid.uuid4())
    
    if OPIK_AVAILABLE and opik:
        try:
            opik_update_current_trace(
                input={
                    "user_input": user_request.user_input,
                    "user_profile": {
                        "is_pregnant": user_request.user_profile.is_pregnant,
                        "trimester": user_request.user_profile.trimester,
                        "current_time": user_request.user_profile.current_time,
                        "country_code": user_request.user_profile.country_code,
                    }
                },
                metadata={
                    "session_id": session_id,
                    "prompt_version": INUA_PROMPT_VERSION,
                    "model_version": INUA_MODEL_VERSION,
                    "is_pregnant": user_request.user_profile.is_pregnant,
                    "trimester": user_request.user_profile.trimester,
                    "country_code": user_request.user_profile.country_code,
                    "current_time": user_request.user_profile.current_time,
                    "mode": "pregnancy" if user_request.user_profile.is_pregnant else "normal"
                },
                tags=["inua", "breath", "health", f"prompt_{INUA_PROMPT_VERSION}"]
            )
            with opik.start_as_current_span(
                name="request_metadata",
                type="general",
                metadata={
                    "session_id": session_id,
                    "prompt_version": INUA_PROMPT_VERSION,
                    "model_version": INUA_MODEL_VERSION,
                    "is_pregnant": user_request.user_profile.is_pregnant,
                    "trimester": user_request.user_profile.trimester,
                    "country_code": user_request.user_profile.country_code,
                    "current_time": user_request.user_profile.current_time,
                    "mode": "pregnancy" if user_request.user_profile.is_pregnant else "normal"
                }
            ):
                pass  # Metadata set, continue
        except Exception as e:
            log_debug(f"Opik metadata span error: {e}")
    
    return generate_response(user_request)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
