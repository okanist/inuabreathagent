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
client = OpenAI(
    base_url="https://api.intelligence.io.solutions/api/v1",
    api_key=os.environ.get("IOINTELLIGENCE_API_KEY", "").strip()
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
    app_command: Optional[Dict] = None
    emergency_override: Optional[Dict] = None

# --- LOGIC ---

# --- DATABASE LOADING ---
TEMP_DB_PATH = "../app/assets/data/breathing_techniques_db.json"

def load_techniques_db():
    try:
        if not os.path.exists(TEMP_DB_PATH):
             # Fallback if running from a different CWD
             return {"breathing_techniques_db": {"categories": []}}
        with open(TEMP_DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading DB: {e}", flush=True)
        return {"breathing_techniques_db": {"categories": []}}

DB = load_techniques_db()

@track(name="retrieve_knowledge")
def get_safe_techniques(profile: UserProfile):
    print("DEBUG: Filtering techniques...", flush=True)
    safe_list = []
    
    # Parse Time
    try:
        hour = int(profile.current_time.split(":")[0])
    except:
        hour = 12 # Default to noon if parse fails
    
    is_night = hour >= 21 or hour < 6
    print(f"DEBUG: Hour={hour}, IsNight={is_night}, Pregnant={profile.is_pregnant}", flush=True)
    
    # Iterate Categories
    for cat in DB.get("breathing_techniques_db", {}).get("categories", []):
        cat_id = cat.get("id")
        
        # Time Filters
        if is_night and cat_id == "focus_energy":
            continue # Don't energize at night
        if not is_night and cat_id == "sleep_deep_rest":
             pass # Taking user instruction strictly: "act according to night and day" -> Usually implies contextual relevance.
             # However, anxiety techniques are always valid.
        
        for tech in cat.get("techniques", []):
            # Pregnancy Filter
            if profile.is_pregnant:
                safety = tech.get("pregnancy_safety", {})
                is_safe = safety.get("is_safe", True)
                
                if not is_safe:
                     # Check for modification
                    if "modification" in safety:
                        tech_name = f"{tech['name']} (MODIFIED: {safety['modification']})"
                    else:
                        continue # Skip unsafe
                else:
                    tech_name = tech['name']
            else:
                 tech_name = tech['name']

            # Format for LLM
            entry = f"{tech_name}: {tech.get('purpose', '')}"
            safe_list.append(entry)
            
    print(f"DEBUG: Final Safe List ({len(safe_list)} items): {safe_list}", flush=True)
    return safe_list

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
    print(f"DEBUG: Processing request: {request.user_input}", flush=True)
    
    # A. Guardrail
    intent = check_crisis_intent(request.user_input)
    if intent["is_crisis"]:
        print("DEBUG: Crisis Detected!", flush=True)
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
    
    # C. Inference
    print("DEBUG: Calling LLM...", flush=True)
    system_prompt = f"""
    Role: Somatic Breath Coach.
    User Context: Pregnant={request.user_profile.is_pregnant}, Trimester={request.user_profile.trimester}.
    Allowed Techniques: {safe_techniques}
    Constraint: NEVER suggest holding breath.
    Output: JSON only. Example: {{ "message_for_user": "...", "suggested_technique_id": "..." }}
    """
    
    try:
        with open("c:\\Code\\InuaBreath\\backend\\debug_prompt.txt", "w", encoding="utf-8") as f:
            f.write(system_prompt)
    except: pass
    
    try:
        response_obj = client.chat.completions.create(
            model="meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.user_input}
            ]
        )
        content = response_obj.choices[0].message.content
        print("DEBUG: LLM Response Received.", flush=True)
        print("RAW LLM RESPONSE:", content, flush=True)
        
        # Parse
        if "```json" in content:
            content = content.replace("```json", "").replace("```", "").strip()
        
        try:
            parsed_json = json.loads(content)
            return parsed_json
        except json.JSONDecodeError:
            return {"message_for_user": content, "suggested_technique_id": None}
            
    except Exception as e:
        print(f"LLM ERROR: {e}", flush=True)
        return {"message_for_user": f"Error interacting with agent: {str(e)}"}

# --- API ENDPOINTS ---

@app.post("/api/agent/chat", response_model=AgentResponse)
@track(name="agent_chat_endpoint")
def chat_endpoint(request: UserRequest):
    print("DEBUG: Endpoint hit", flush=True)
    return generate_response(request)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
