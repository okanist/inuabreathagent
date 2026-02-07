import os
import json
from openai import OpenAI
from dotenv import load_dotenv

# Load env variables
load_dotenv()

api_key = os.environ.get("IOINTELLIGENCE_API_KEY")
print(f"API Key found: {'Yes' if api_key else 'No'}")

client = OpenAI(
    base_url="https://api.intelligence.io.solutions/api/v1",
    api_key=api_key.strip() if api_key else None
)

model = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8"

print(f"Testing model: {model}")

try:
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello, are you working? Please reply with 'Yes, I am working'."}
        ]
    )
    print("\n--- API RESPONSE ---")
    print(response.choices[0].message.content)
    print("--------------------")

except Exception as e:
    print(f"\nERROR: {e}")
