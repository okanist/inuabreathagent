import requests
import json
import time
from dotenv import load_dotenv
import os

load_dotenv()

print("=== FULL BACKEND API TEST ===\n")

# Test configuration
API_URL = "http://localhost:8001/api/agent/chat"
TEST_REQUEST = {
    "user_input": "I'm feeling anxious and stressed",
    "user_profile": {
        "is_pregnant": False,
        "trimester": None,
        "current_time": "14:30",
        "country_code": "TR"
    }
}

print("1. Checking if server is running...")
try:
    response = requests.get("http://localhost:8001/docs", timeout=2)
    print(f"   [OK] Server is running (status: {response.status_code})")
except requests.exceptions.ConnectionError:
    print("   [ERROR] Server is not running!")
    print("   Please start the server with: python server.py")
    exit(1)
except Exception as e:
    print(f"   [WARN] Could not check server status: {e}")

print("\n2. Testing API endpoint...")
print(f"   URL: {API_URL}")
print(f"   Request: {json.dumps(TEST_REQUEST, indent=2)}")

try:
    response = requests.post(
        API_URL,
        json=TEST_REQUEST,
        headers={"Content-Type": "application/json"},
        timeout=30
    )
    
    print(f"\n   Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("\n   [OK] API Response:")
        print(f"   - Message: {data.get('message_for_user', 'N/A')[:100]}...")
        print(f"   - Technique ID: {data.get('suggested_technique_id', 'N/A')}")
        print(f"   - Duration: {data.get('duration_seconds', 'N/A')} seconds")
        if data.get('thought_process'):
            print(f"   - Thought Process: {data.get('thought_process')[:100]}...")
        print("\n   [SUCCESS] Full API test passed!")
    else:
        print(f"\n   [ERROR] API returned status {response.status_code}")
        print(f"   Response: {response.text}")
        
except requests.exceptions.Timeout:
    print("\n   [ERROR] Request timed out (server might be slow)")
except Exception as e:
    print(f"\n   [ERROR] Request failed: {e}")

print("\n=== TEST COMPLETE ===")
