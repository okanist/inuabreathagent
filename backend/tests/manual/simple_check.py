import requests

url = "http://localhost:8001/api/agent/chat"
payload = {
    "user_input": "I can't sleep.",
    "user_profile": {"is_pregnant": True, "current_time": "23:00", "country_code": "US"}
}

try:
    resp = requests.post(url, json=payload, timeout=30)
    data = resp.json()
    msg = data.get("message_for_user", "NO_MESSAGE_FOUND")
    tech = data.get("suggested_technique_id", "None")
    
    print(f"\n--------------- AGENT RESPONSE ---------------\n")
    print(f"FULL JSON: {data}")
    print(f"MESSAGE: {msg}")
    print(f"TECHNIQUE: {tech}")
    print(f"\n----------------------------------------------\n")

except Exception as e:
    print(f"ERROR: {e}")
