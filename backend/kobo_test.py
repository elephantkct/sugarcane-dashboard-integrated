"""
One-off test script: fetches submissions from your Kobo form and saves the
raw JSON so we can see the actual field names Kobo uses (these are usually
different from the human-readable column headers in your Excel export).

Fill in the two values below, then run:
    python kobo_test.py
"""
import json
import requests

KOBO_API_TOKEN = "PASTE_YOUR_API_TOKEN_HERE"
KOBO_ASSET_UID = "PASTE_YOUR_ASSET_UID_HERE"

# Use kf.kobotoolbox.org unless your organization uses a different/private
# KoboToolbox server (e.g. a custom EU or self-hosted instance) — if so,
# replace this with that server's domain.
KOBO_BASE_URL = "https://kf.kobotoolbox.org"

url = f"{KOBO_BASE_URL}/api/v2/assets/{KOBO_ASSET_UID}/data.json"
headers = {"Authorization": f"Token {KOBO_API_TOKEN}"}

response = requests.get(url, headers=headers)
response.raise_for_status()
data = response.json()

print(f"Total submissions found: {data.get('count')}")

results = data.get("results", [])
if results:
    # Save the first submission's full raw JSON so we can inspect every field name
    with open("sample_submission.json", "w", encoding="utf-8") as f:
        json.dump(results[0], f, indent=2, ensure_ascii=False)
    print("Saved first submission to sample_submission.json — open it and share it back.")

    # Also print just the validation status, to confirm that field's exact shape
    print("\n_validation_status field:")
    print(json.dumps(results[0].get("_validation_status"), indent=2))
else:
    print("No submissions found — check your ASSET_UID and API_TOKEN.")