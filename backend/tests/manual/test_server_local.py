import requests
import json

url = "http://localhost:8000/api/agent/chat"
headers = {"Content-Type": "application/json"}
payload = {
    "user_input": "I have an exam tomorrow, I'm very nervous.",
    "user_profile": {
        "is_pregnant": False,
        "current_time": "20:00",
        "country_code": "TR"
    }
}

print(f"Testing {url}...")
try:
    resp = requests.post(url, json=payload)
    print(f"Status: {resp.status_code}", flush=True)
    print("Response matched structure:", "message_for_user" in resp.json(), flush=True)
    print("Full Response:", json.dumps(resp.json(), indent=2), flush=True)
except Exception as e:
    print(f"Failed: {e}")
