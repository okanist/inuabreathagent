import requests
import json

print("=== Testing v3 Prompt ===\n")

# Test with v3 prompt
test = {
    "user_input": "I'm feeling really anxious and can't focus",
    "user_profile": {
        "is_pregnant": False,
        "trimester": None,
        "current_time": "14:30",
        "country_code": "TR"
    }
}

try:
    response = requests.post("http://localhost:8001/api/agent/chat", json=test, timeout=10)
    if response.status_code == 200:
        data = response.json()
        print(f"[OK] Response received")
        print(f"- Technique ID: {data.get('suggested_technique_id')}")
        print(f"- Message: {data.get('message_for_user', '')[:100]}...")
        print(f"- Instruction: {data.get('instruction_text', '')[:100]}...")
        print(f"- Has instruction_text: {'instruction_text' in data}")
        
        # Check if response structure is correct
        required_fields = ['message_for_user', 'suggested_technique_id', 'instruction_text', 'suggested_technique']
        missing = [f for f in required_fields if f not in data]
        if missing:
            print(f"[WARNING] Missing fields: {missing}")
        else:
            print(f"[OK] All required fields present")
    else:
        print(f"[ERROR] Status: {response.status_code}")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"[ERROR] {e}")

print("\n=== Test Complete ===")
