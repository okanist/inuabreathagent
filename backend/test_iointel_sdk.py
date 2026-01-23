import os
import requests
from dotenv import load_dotenv

# Load env variables
load_dotenv()

api_key = os.environ.get("IOINTELLIGENCE_API_KEY", "").strip()
print(f"API Key loaded: {'Yes' if api_key else 'No'} (Len: {len(api_key)})")

base_url = "https://api.intelligence.io.solutions/api/v1"

# Payload from user screenshot
payload = {
    "objective": "Test connectivity",
    "agent_names": ["linear_agent"],
    "args": {
        "type": "custom",
        "name": "test-agent",
        "objective": "Say hello",
        "instructions": "Just say 'Hello World'"
    }
}

print(f"Sending POST to {base_url}/workflows/run ...")

try:
    response = requests.post(
        f"{base_url}/workflows/run",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        },
        json=payload,
        timeout=30
    )
    
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(response.text)

except Exception as e:
    print(f"Exception: {e}")
