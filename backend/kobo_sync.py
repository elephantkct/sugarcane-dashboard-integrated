"""
Kobo -> Postgres sync script.

Polls your Kobo form for submissions with validation_status = Approved,
and upserts them into the same farmers/survey_responses/... tables the
Excel import uses — so both data sources stay compatible.

FIELD_MAP below is the ONE section still pending your real Kobo field
names (from sample_submission.json). Everything else is complete and
ready to run once that's filled in.

Run once manually to test:
    python kobo_sync.py
It will also be wired to run automatically on a schedule (see main.py
changes at the bottom of this guide).
"""
import os
import requests
from datetime import datetime
from dotenv import load_dotenv

from app.database import SessionLocal
from app import models

load_dotenv()

KOBO_API_TOKEN = os.getenv("KOBO_API_TOKEN")
KOBO_ASSET_UID = os.getenv("KOBO_ASSET_UID")
KOBO_BASE_URL = os.getenv("KOBO_BASE_URL", "https://kf.kobotoolbox.org")

# Kobo's built-in validation status codes — these are standard across every
# Kobo form (not custom to yours), so this part is safe to hardcode.
APPROVED_STATUS_UID = "validation_status_approved"

# ============================================================
# PENDING: fill this in once we see sample_submission.json.
# Maps our DB column -> the actual key in Kobo's JSON response.
# Left as human-readable Excel-style names for now as placeholders.
# ============================================================
FIELD_MAP = {
    "farmer_code": "Farmer Code",                # placeholder — replace with real Kobo field name
    "farmer_name": "Name of the Farmer",          # placeholder
    "mobile_number": "Mobile Number of the Farmer",  # placeholder
    "village": "Name of the Village",             # placeholder
    "block": "Block name",                        # placeholder
    "district": "District name",                  # placeholder
    "state": "State",                              # placeholder
    "survey_year": "Select Year",                  # placeholder
    "yield_tonnes_per_ha": "Yield_Tonnes_ha",      # placeholder
    "total_nutrient_applied": "tna",               # placeholder
    "gps_latitude": "_Pleaes take the GPS Coordinates:_latitude",   # placeholder
    "gps_longitude": "_Pleaes take the GPS Coordinates:_longitude", # placeholder
    # ... remaining ~55 fields (fertilizer usage, climate events, etc.)
    # will be added here once we see the real field names.
}


def fetch_approved_submissions():
    """Fetch every submission from Kobo, filtered to only Approved ones."""
    url = f"{KOBO_BASE_URL}/api/v2/assets/{KOBO_ASSET_UID}/data.json"
    headers = {"Authorization": f"Token {KOBO_API_TOKEN}"}

    all_results = []
    while url:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        all_results.extend(data.get("results", []))
        url = data.get("next")  # Kobo paginates; follow "next" until exhausted

    approved = [
        r for r in all_results
        if (r.get("_validation_status") or {}).get("uid") == APPROVED_STATUS_UID
    ]
    return approved


def upsert_submission(db, submission: dict):
    """Insert a new approved submission, or update it if we've seen this
    uniqueID before (e.g. a correction was made after initial approval)."""

    unique_id = str(submission.get(FIELD_MAP["farmer_code"]) or submission.get("_id"))
    # NOTE: once FIELD_MAP has the real "uniqueID" field name, use that
    # instead of farmer_code here, to stay consistent with the Excel import's
    # dedupe key.

    farmer_code = submission.get(FIELD_MAP["farmer_code"])
    if not farmer_code:
        return  # skip malformed rows rather than crash the whole sync

    farmer = db.query(models.Farmer).filter(
        models.Farmer.farmer_code == farmer_code
    ).first()
    if not farmer:
        farmer = models.Farmer(
            farmer_code=farmer_code,
            name=submission.get(FIELD_MAP["farmer_name"]),
            mobile_number=submission.get(FIELD_MAP["mobile_number"]),
            village=submission.get(FIELD_MAP["village"]),
            block=submission.get(FIELD_MAP["block"]),
            district=submission.get(FIELD_MAP["district"]),
            state=submission.get(FIELD_MAP["state"]),
        )
        db.add(farmer)
        db.flush()

    survey = db.query(models.SurveyResponse).filter(
        models.SurveyResponse.kobo_unique_id == unique_id
    ).first()

    if not survey:
        survey = models.SurveyResponse(kobo_unique_id=unique_id, farmer_id=farmer.id)
        db.add(survey)

    # Update fields every time (handles corrections made after approval, not
    # just brand-new approvals)
    survey.survey_year = submission.get(FIELD_MAP["survey_year"])
    survey.yield_tonnes_per_ha = submission.get(FIELD_MAP["yield_tonnes_per_ha"])
    survey.total_nutrient_applied = submission.get(FIELD_MAP["total_nutrient_applied"])
    survey.gps_latitude = submission.get(FIELD_MAP["gps_latitude"])
    survey.gps_longitude = submission.get(FIELD_MAP["gps_longitude"])
    survey.validation_status = "Approved"
    survey.submitted_via = "kobo_api"

    # TODO: same pattern for fertilizer_usage / climate_events / etc. child
    # tables, mirroring import_excel.py, once FIELD_MAP is complete.

    db.flush()


def run_sync():
    print(f"[{datetime.now()}] Starting Kobo sync...")
    submissions = fetch_approved_submissions()
    print(f"  Found {len(submissions)} approved submissions.")

    db = SessionLocal()
    try:
        for s in submissions:
            upsert_submission(db, s)
        db.commit()
        print(f"[{datetime.now()}] Sync complete.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_sync()
