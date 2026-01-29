import os
from dotenv import load_dotenv
load_dotenv()

print("--- OPIK TEST ---")

try:
    from opik import Opik
    key = os.environ.get('OPIK_API_KEY', '').strip()
    print(f"Opik API Key: {'Found' if key else 'Not found'}")
    
    if key:
        client = Opik(project_name='test', api_key=key)
        print("[OK] Opik client initialized successfully")
    else:
        print("[WARN] Opik API key not found")
except Exception as e:
    print(f"[ERROR] Opik Error: {e}")
