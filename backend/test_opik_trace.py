import os
import requests
from dotenv import load_dotenv
load_dotenv()

print("=== OPIK TRACE TEST ===\n")

# Test if Opik is sending traces
print("1. Testing Opik trace sending...")

try:
    from opik import Opik, track
    
    opik_api_key = os.environ.get("OPIK_API_KEY", "").strip()
    if not opik_api_key:
        print("   [ERROR] OPIK_API_KEY not found in .env")
        exit(1)
    
    print(f"   [OK] Opik API Key found")
    
    # Initialize Opik client
    opik_client = Opik(
        project_name="Breathing-Agent-Hackathon",
        api_key=opik_api_key
    )
    print(f"   [OK] Opik client initialized")
    
    # Test trace with decorator
    @track(name="test_trace", flush=True)
    def test_function():
        return "Test result"
    
    result = test_function()
    print(f"   [OK] Test function executed: {result}")
    
    # Flush to ensure traces are sent
    if opik_client:
        flushed = opik_client.flush(timeout=5)
        print(f"   [OK] Opik flush completed: {flushed}")
    
    print("\n2. Testing actual API endpoint with Opik...")
    
    # Test the actual API
    API_URL = "http://localhost:8001/api/agent/chat"
    test_request = {
        "user_input": "I'm feeling anxious",
        "user_profile": {
            "is_pregnant": False,
            "trimester": None,
            "current_time": "14:30",
            "country_code": "TR"
        }
    }
    
    try:
        response = requests.post(API_URL, json=test_request, timeout=10)
        if response.status_code == 200:
            print("   [OK] API call successful")
            print("   [INFO] Check Opik dashboard for traces:")
            print("   [INFO] Project: Breathing-Agent-Hackathon")
            print("   [INFO] Traces should appear in a few seconds")
        else:
            print(f"   [WARN] API returned status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   [ERROR] Server not running. Start with: python server.py")
    except Exception as e:
        print(f"   [ERROR] API test failed: {e}")
    
    print("\n=== TEST COMPLETE ===")
    print("\n[INFO] If traces don't appear in dashboard:")
    print("  1. Check Opik dashboard: https://www.comet.com/opik/")
    print("  2. Verify project name: Breathing-Agent-Hackathon")
    print("  3. Check API key is correct")
    print("  4. Wait a few seconds for traces to sync")
    
except ImportError:
    print("   [ERROR] Opik not installed")
except Exception as e:
    print(f"   [ERROR] Opik test failed: {e}")
    import traceback
    traceback.print_exc()
