
import os
import socket
import requests
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

print("--- DIAGNOSTICS START ---")

# 1. Check Internet / DNS
TARGET_HOST = "api.intelligence.io.solutions"
print(f"\n1. Testing DNS resolution for {TARGET_HOST}...")
try:
    ip = socket.gethostbyname(TARGET_HOST)
    print(f"   SUCCESS: Resolved to {ip}")
except Exception as e:
    print(f"   FAIL: DNS Error - {e}")

# 2. Check Basic Connectivity (HTTP)
print(f"\n2. Testing HTTPS connection to {TARGET_HOST}...")
try:
    url = f"https://{TARGET_HOST}/health" # Guessing health, or just root
    resp = requests.get(f"https://{TARGET_HOST}", timeout=5)
    print(f"   STATUS CODE: {resp.status_code}")
except Exception as e:
    print(f"   FAIL: HTTP Request Error - {e}")

# 3. Check OpenAI Client
print(f"\n3. Testing OpenAI Client Call...")
api_key = os.environ.get("IOINTELLIGENCE_API_KEY")
if not api_key:
    print("   FAIL: No API Key found in env")
else:
    print(f"   API Key found: {api_key[:5]}...{api_key[-3:]}")
    
    client = OpenAI(
        base_url="https://api.intelligence.io.solutions/api/v1",
        api_key=api_key
    )
    
    try:
        completion = client.chat.completions.create(
            model="meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
            messages=[
                {"role": "user", "content": "Hello, are you online?"}
            ]
        )
        print("   SUCCESS: LLM Responded!")
        print(f"   Response: {completion.choices[0].message.content}")
    except Exception as e:
        print(f"   FAIL: LLM Call Error - {e}")

print("\n--- DIAGNOSTICS END ---")
