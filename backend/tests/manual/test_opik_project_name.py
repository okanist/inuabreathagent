import os
import requests
from dotenv import load_dotenv
load_dotenv()

print("=== OPIK PROJECT NAME TEST ===\n")

# Check project name from .env
project_name = os.environ.get("OPIK_PROJECT_NAME", "InuaBreath").strip()
print(f"1. Project name from .env: {project_name}")

# Test Opik initialization
try:
    from opik import Opik
    
    opik_api_key = os.environ.get("OPIK_API_KEY", "").strip()
    if opik_api_key:
        client = Opik(
            project_name=project_name,
            api_key=opik_api_key
        )
        print(f"2. [OK] Opik client initialized with project: {project_name}")
        
        # Test trace
        from opik import track
        
        @track(name="test_project_name", flush=True)
        def test_trace():
            return f"Testing project: {project_name}"
        
        result = test_trace()
        print(f"3. [OK] Test trace created: {result}")
        
        # Flush
        flushed = client.flush(timeout=5)
        print(f"4. [OK] Traces flushed: {flushed}")
        
        print(f"\n[SUCCESS] Opik is using project name: {project_name}")
        print(f"[INFO] Check Opik dashboard: https://www.comet.com/opik/")
        print(f"[INFO] Look for project: {project_name}")
        
    else:
        print("[ERROR] OPIK_API_KEY not found")
        
except Exception as e:
    print(f"[ERROR] Opik test failed: {e}")
    import traceback
    traceback.print_exc()

print("\n=== TEST COMPLETE ===")
