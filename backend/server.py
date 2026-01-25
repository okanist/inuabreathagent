import os
from dotenv import load_dotenv
load_dotenv()

import json
from typing import Optional, List, Dict
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from openai import OpenAI
import uvicorn

# --- CONFIGURATION ---
app = FastAPI(title="Breathing AI Agent Backend")

# CORS Middleware for Web Support
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods including OPTIONS
    allow_headers=["*"],
)

# Opik Mocking
try:
    from opik import Opik, track
    if os.environ.get("OPIK_API_KEY"):
        opik_client = Opik(project_name="Breathing-Agent-Hackathon")
    else:
        raise ImportError("No Opik Key")
except:
    print("Opik disabled (no key or module)")
    def track(name=None):
        def decorator(func):
            return func
        return decorator
    opik_client = None

# Initialize Client
api_key = os.environ.get("IOINTELLIGENCE_API_KEY", "").strip()
print(f"DEBUG INIT: CWD = {os.getcwd()}", flush=True)
print(f"DEBUG INIT: API Key present? {'YES' if api_key else 'NO'} (Length: {len(api_key)})", flush=True)

client = OpenAI(
    base_url="https://api.intelligence.io.solutions/api/v1",
    api_key=api_key
)

# --- DATA MODELS ---
class UserProfile(BaseModel):
    is_pregnant: bool
    trimester: Optional[int] = None
    current_time: str
    country_code: Optional[str] = "TR"

class UserRequest(BaseModel):
    user_input: str
    user_profile: UserProfile

class AgentResponse(BaseModel):
    message_for_user: Optional[str] = None
    suggested_technique_id: Optional[str] = None
    suggested_technique: Optional[Dict] = None  # Full technique object (V2)
    duration_seconds: Optional[int] = 180
    app_command: Optional[Dict] = None
    emergency_override: Optional[Dict] = None
    thought_process: Optional[str] = None  # Chain of Thought for Opik tracing

# ... (rest of code)

# --- LOGIC ---

# --- DATABASE LOADING (V2 Schema) ---
DB_PATH = os.path.join(os.path.dirname(__file__), "breathing_db.json")

def load_techniques_db():
    """Load V2 breathing techniques database"""
    try:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data
    except Exception as e:
        print(f"Error loading DB: {e}", flush=True)
        return {"meta_info": {}, "techniques": []}

DB = load_techniques_db()

# --- LOGGING UTILS ---
LOG_FILE = "server_debug.log"

def log_debug(message: str):
    """Writes message to both console and file"""
    print(message, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(message + "\n")
    except Exception as e:
        print(f"Log Error: {e}")



@track(name="retrieve_knowledge")
def get_safe_techniques(profile: UserProfile):
    """
    Filter techniques based on V2 context_rules:
    - time_of_day: ["day"], ["night"], or ["any"]
    - pregnancy_logic: "SAFE", "BLOCK", or "MODIFY"
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
    
    safe_list = []
    techniques = DB.get("techniques", [])
    
    for tech in techniques:
        tech_id = tech.get("id", "")
        title = tech.get("title", "")
        context = tech.get("context_rules", {})
        agent_config = tech.get("agent_config", {})
        
        # 1. TIME OF DAY FILTER
        allowed_times = context.get("time_of_day", ["any"])
        if time_period not in allowed_times and "any" not in allowed_times:
            log_debug(f"DEBUG: Skipping {title} - wrong time ({time_period} not in {allowed_times})")
            continue
        
        # 2. PREGNANCY FILTER & INSTRUCTION MODIFICATION
        instruction_text = agent_config.get("instruction_clue", "")
        
        if profile.is_pregnant:
            pregnancy_logic = context.get("pregnancy_logic", "SAFE")
            
            if pregnancy_logic == "BLOCK":
                alt_id = context.get("pregnancy_alternative_id")
                log_debug(f"DEBUG: BLOCKED {title} for pregnancy. Alt: {alt_id}")
                continue
            
            elif pregnancy_logic == "MODIFY":
                # CRITICAL FIX: Tell LLM that this technique is modified for pregnancy
                instruction_text = f"[MODIFIED FOR PREGNANCY - No Breath Holding] {instruction_text.replace('Hold', 'Skip hold')}"
                log_debug(f"DEBUG: {title} instruction modified for pregnancy")
        
        # 3. Build entry for LLM context
        entry = (
            f"- ID: {tech_id} | Name: {title}\n"
            f"  Purpose: {agent_config.get('purpose', 'General relaxation')}\n"
            f"  Instruction: {instruction_text}"
        )
        safe_list.append(entry)
    
    # Return as formatted string for LLM
    techniques_str = "\n".join(safe_list)
    log_debug(f"DEBUG: Final Safe List ({len(safe_list)} items):\n{techniques_str}")
    return techniques_str

@track(name="guardrail_check")
def check_crisis_intent(user_input: str):
    # DISABLED FOR DEBUGGING
    crisis_keywords = ["suicide", "kill myself", "i want to die", "heart attack"] 
    for word in crisis_keywords:
        if word in user_input.lower():
            return {"is_crisis": True, "category": "MEDICAL_EMERGENCY" if "heart" in word else "SUICIDE"}
    return {"is_crisis": False, "category": "NONE"}

@track(name="generate_agent_response")
def generate_response(request: UserRequest):
    log_debug(f"DEBUG: Processing request: {request.user_input}")
    
    # A. Guardrail
    intent = check_crisis_intent(request.user_input)
    if intent["is_crisis"]:
        log_debug("DEBUG: Crisis Detected!")
        return {
            "emergency_override": {
                "detected_category": intent["category"],
                "ui_action": "show_fullscreen_sos",
                "display_message": "Emergency detected.",
                "buttons": []
            }
        }

    # B. RAG
    safe_techniques = get_safe_techniques(request.user_profile)
    
    # C. Inference - Structured JSON Output with Thought Process for Opik
    MODEL_NAME = os.environ.get("LLM_MODEL_NAME", "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8")
    log_debug(f"DEBUG: Calling LLM ({MODEL_NAME}) with structured JSON prompt...")
    
    system_prompt = f"""You are 'Inua', an expert Somatic Breath Coach.
Analyze the user's emotional state and select the BEST matching breathing technique ID from the available list.

### USER CONTEXT
- Pregnant: {request.user_profile.is_pregnant} (CRITICAL: If true, NO BREATH HOLDING allowed)
- Time: {request.user_profile.current_time}

### AVAILABLE TECHNIQUES
{safe_techniques}

### INSTRUCTIONS
1. Analyze the user's input.
2. Select one technique ID.
3. Generate a JSON response.

### OUTPUT FORMAT (JSON ONLY)
Return ONLY the raw JSON object. Do not wrap in markdown code blocks. Do not add conversational text.

{{
  "thought_process": "Brief reasoning. E.g., User is anxious + pregnant -> box_breath blocked -> selecting physiological_sigh.",
  "technique_id": "exact_id_from_list",
  "empathy_line": "A warm, short sentence validating their feeling.",
  "reason_line": "A short 1-sentence explanation of why this technique helps."
}}
"""
    
    try:
        with open("c:\\Code\\InuaBreath\\backend\\debug_prompt.txt", "w", encoding="utf-8") as f:
            f.write(system_prompt)
    except: pass
    
    try:
        response_obj = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.user_input}
            ],
            temperature=0.3  # Lower temperature for JSON stability
        )
        content = response_obj.choices[0].message.content
        log_debug("DEBUG: LLM Response Received.")
        log_debug(f"RAW LLM RESPONSE: {content}")
        
        # Robust JSON Parsing using Regex
        import re
        try:
            # 1. Try to find JSON object structure
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
            
            # 2. Cleanup markdown code blocks if any remain inside
            if "```json" in content:
                content = content.replace("```json", "").replace("```", "").strip()
            if "```" in content:
                content = content.replace("```", "").strip()
        except:
            pass # Fallback to original content to try standard json.loads
        
        try:
            llm_output = json.loads(content)
            
            # --- STRUCTURED MESSAGE CONSTRUCTION ---
            tech_id = llm_output.get("technique_id", "equal_breathing")
            empathy = llm_output.get("empathy_line", "I'm here to help you feel better.")
            reason = llm_output.get("reason_line", "This breathing technique will help you relax.")
            
            # Find technique in DB
            found_tech = None
            for tech in DB.get("techniques", []):
                if tech.get("id") == tech_id:
                    found_tech = tech
                    break
            
            # Fallback to equal_breathing if not found
            if not found_tech:
                for tech in DB.get("techniques", []):
                    if tech.get("id") == "equal_breathing":
                        found_tech = tech
                        tech_id = "equal_breathing"
                        break
            
            if found_tech:
                title = found_tech.get("title", "Breathing Exercise")
                agent_config = found_tech.get("agent_config", {})
                original_instruction = agent_config.get("instruction_clue", "Breathe in slowly, then breathe out.")
                duration = found_tech.get("default_duration_sec", 180)
                
                # Get phases (may be modified for pregnancy)
                context = found_tech.get("context_rules", {})
                phases = found_tech.get("phases", {})
                
                pregnancy_modified = False
                if request.user_profile.is_pregnant and context.get("pregnancy_logic") == "MODIFY":
                    phases = context.get("pregnancy_mod_phases", phases)
                    pregnancy_modified = True
                    log_debug(f"DEBUG: Applied pregnancy_mod_phases for {tech_id}")
                
                # Generate instruction from actual phases
                if pregnancy_modified:
                    # Build instruction from modified phases (no holds)
                    inhale = phases.get("inhale_sec", 4)
                    exhale = phases.get("exhale_sec", 4)
                    instruction = f"Inhale through nose for {inhale}s, exhale through mouth for {exhale}s. (No breath holding)"
                    safety_note = "\n\n_For your safety, I've removed breath-holding from this technique._"
                    message = f"{empathy} {reason}{safety_note}\n\n**{title}**\n{instruction}"
                else:
                    instruction = original_instruction
                    message = f"{empathy} {reason}\n\n**{title}**\n{instruction}"
                
                # Build response
                result = {
                    "message_for_user": message,
                    "suggested_technique_id": tech_id,
                    "thought_process": llm_output.get("thought_process", f"Selected {tech_id}"),
                    "duration_seconds": duration,
                    "suggested_technique": {
                        "id": tech_id,
                        "title": title,
                        "category": found_tech.get("category", ""),
                        "phases": phases,
                        "ui_texts": found_tech.get("ui_texts", {}),
                        "default_duration_sec": duration
                    }
                }
                
                # Duration adjustments
                user_input_lower = request.user_input.lower()
                if "sleep" in user_input_lower or "insomnia" in user_input_lower:
                    result["duration_seconds"] = max(duration, 240)
                
                log_debug(f"FINAL RESULT: {result}")
                return result
            else:
                return {"message_for_user": "Let me help you relax.", "duration_seconds": 180}
        except json.JSONDecodeError:
            log_debug(f"JSON ERROR content: {content}")
            return {"message_for_user": content, "suggested_technique_id": None, "duration_seconds": 180}
            
    except Exception as e:
        import traceback
        log_debug(f"LLM ERROR: {e}")
        log_debug(f"TRACEBACK: {traceback.format_exc()}")
        return {"message_for_user": f"Error interacting with agent: {str(e)}"}

# --- API ENDPOINTS ---

@app.get("/api/breathing/techniques")
def get_techniques_endpoint(is_pregnant: bool = False, is_night: bool = False):
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
            pregnancy_logic = context.get("pregnancy_logic", "SAFE")
            
            if pregnancy_logic == "BLOCK":
                continue
            elif pregnancy_logic == "MODIFY":
                # Replace phases with modified phases
                if "pregnancy_mod_phases" in context:
                    tech_copy["phases"] = context["pregnancy_mod_phases"]
        
        result.append(tech_copy)
    
    return {"techniques": result}

@app.post("/api/agent/chat", response_model=AgentResponse)
@track(name="agent_chat_endpoint")
def chat_endpoint(request: UserRequest):
    log_debug("DEBUG: Endpoint hit")
    return generate_response(request)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
