"""
Import the EDF_SUGARCANE_APPROVED_SURVEY.xlsx master file into Postgres.

Usage:
    python import_excel.py path/to/EDF_SUGARCANE_APPROVED_SURVEY.xlsx

Safe to re-run: farmers are upserted by farmer_code, and survey rows are
upserted by kobo_unique_id (the 'uniqueID' column), so running this twice
will not create duplicates.
"""
import sys
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app import models

# Known typo/whitespace variants seen in the source data, mapped to the
# canonical spelling. Keeps future imports (including the Kobo pipeline)
# from reintroducing the same inconsistencies.
BLOCK_NAME_FIXES = {
    "Kanchikovil": "Kanjikovil",
    "Kanjokovil": "Kanjikovil",
    "kanjikovil": "Kanjikovil",
    "Sakthi Nagar": "Sakthinagar",
}

VILLAGE_NAME_FIXES = {
    "Kanjokovil": "Kanjikovil",
    "Kanthampalayam": "Kandhampalayam",
    "Koil palayam": "Koilpalayam",
    "NALLAMPATTI": "Nallampatti",
    "Olappalayam": "Olapalayam",
    "Petham palayam": "Pethampalayam",
    "Pethampalyam": "Pethampalayam",
    "Prakash nagar": "Prakash Nagar",
    "Vembathi": "Vembathy",
    "periyavilamalai": "Periyavilamalai",
}


def normalize_name(raw_value, fixes: dict):
    """Trim whitespace and correct known typo variants."""
    if raw_value is None or pd.isna(raw_value):
        return raw_value
    cleaned = str(raw_value).strip()
    return fixes.get(cleaned, cleaned)

# Fertilizer/manure columns: (column name in Excel, short name to store, is_organic)
FERTILIZER_COLUMNS = [
    ("Total Urea used in the largest plot of ${Crop} Crop (in Kgs.)", "Urea", False),
    ("Total DAP used in the largest plot of ${Crop} Crop (in Kgs.)", "DAP", False),
    ("Total SSP used in the largest plot of ${Crop} Crop (in Kgs.)", "SSP", False),
    ("Total MOP used in the largest plot of ${Crop} Crop (in Kgs.)", "MOP", False),
    ("Total NPK 10-26-26 used in the largest plot of ${Crop} Crop (in Kgs.)", "NPK 10-26-26", False),
    ("Total NPK 12-32-16 used in the largest plot of ${Crop} Crop (in Kgs.)", "NPK 12-32-16", False),
    ("Total NPS 20-20-0-13 used in the largest plot of ${Crop} Crop (in Kgs.)", "NPS 20-20-0-13", False),
    ("Total Ammonium Sulphate used in the largest plot of ${Crop} Crop (in Kgs.)", "Ammonium Sulphate", False),
    ("Total Ammonium Chloride used in the largest plot of ${Crop} Crop (in Kgs.)", "Ammonium Chloride", False),
    ("Total NPK 17-17-17 used in the largest plot of ${Crop} Crop (in Kgs.)", "NPK 17-17-17", False),
    ("Total NPKS-16-20-0-13 used in the largest plot of ${Crop} Crop (in Kgs.)", "NPKS-16-20-0-13", False),
    ("Total NPK-16-16-16 used in the largest plot of ${Crop} Crop (in Kgs.)", "NPK-16-16-16", False),
    ("Total NPK-12-61-0 used in the largest plot of ${Crop} Crop (in Kgs.)", "NPK-12-61-0", False),
    ("Total NPKS-15-15-15-09 used in the largest plot of ${Crop} Crop (in Kgs.)", "NPKS-15-15-15-09", False),
    ("Total NPK-19-19-19 used in the largest plot of ${Crop} Crop (in Kgs.)", "NPK-19-19-19", False),
    ("Total Mono_11_52_0 used in the largest plot of ${Crop} Crop (in Kgs.)", "Mono 11-52-0", False),
    ("Total Calcium_ammonium_nitrate used in the largest plot of ${Crop} Crop (in Kgs.)", "Calcium Ammonium Nitrate", False),
    ("Total Farm Yard Manure used in the largest plot of ${Crop} Crop (in Kgs.)", "Farm Yard Manure", True),
    ("Total Vermicompost used in the largest plot of ${Crop} Crop (in Kgs.)", "Vermicompost", True),
    ("Total Goat/Sheep Manure used in the largest plot of ${Crop} Crop (in Kgs.)", "Goat/Sheep Manure", True),
    ("Total Poultry Manure used in the largest plot of ${Crop} Crop (in Kgs.)", "Poultry Manure", True),
    ("Total Press Mud used in the largest plot of ${Crop} Crop (in Kgs.)", "Press Mud", True),
    ("Total Jeevamrut/GhanaJivamrut used in the largest plot of ${Crop} Crop (in Kgs.)", "Jeevamrut/GhanaJivamrut", True),
]

CLIMATE_EVENT_COLUMNS = [
    ("Which severe climatic events your ${Crop} faced during ${Year}?/Erratic_rainfall", "Erratic_rainfall"),
    ("Which severe climatic events your ${Crop} faced during ${Year}?/Cyclone", "Cyclone"),
    ("Which severe climatic events your ${Crop} faced during ${Year}?/Drought", "Drought"),
    ("Which severe climatic events your ${Crop} faced during ${Year}?/Flood", "Flood"),
]

CLIMATE_STAGE_COLUMNS = [
    ("During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/sprouting", "sprouting"),
    ("During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/tillering", "tillering"),
    ("During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/grand_growth", "grand_growth"),
    ("During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/maturity", "maturity"),
]

FERT_METHOD_COLUMNS = [
    ("What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?/Broadcasting", "Broadcasting"),
    ("What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?/Surface_fertigation", "Surface_fertigation"),
    ("What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?/Sub_surface_fertigation", "Sub_surface_fertigation"),
    ("What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?/Foliar_application", "Foliar_application"),
]


def truthy(val):
    """Kobo exports selected multi-choice options as 1.0 / 0.0 / NaN."""
    return bool(val) and not pd.isna(val) and float(val) == 1.0


def get_or_create_organization(db: Session, name: str, cache: dict):
    if not name or pd.isna(name):
        return None
    if name in cache:
        return cache[name]
    org = db.query(models.Organization).filter(models.Organization.name == name).first()
    if not org:
        org = models.Organization(name=name)
        db.add(org)
        db.flush()
    cache[name] = org
    return org


def get_or_create_employee(db: Session, name: str, designation: str, org, cache: dict):
    if not name or pd.isna(name):
        return None
    key = (name, designation, org.id if org else None)
    if key in cache:
        return cache[key]
    emp = db.query(models.Employee).filter(
        models.Employee.name == name,
        models.Employee.organization_id == (org.id if org else None),
    ).first()
    if not emp:
        emp = models.Employee(name=name, designation=designation, organization_id=org.id if org else None)
        db.add(emp)
        db.flush()
    cache[key] = emp
    return emp


def get_or_create_farmer(db: Session, row, cache: dict):
    farmer_code = row["Farmer Code"]
    if farmer_code in cache:
        return cache[farmer_code]

    farmer = db.query(models.Farmer).filter(models.Farmer.farmer_code == farmer_code).first()
    if not farmer:
        farmer = models.Farmer(
            farmer_code=farmer_code,
            name=row["Name of the Farmer"],
            mobile_number=str(row["Mobile Number of the Farmer"]) if not pd.isna(row["Mobile Number of the Farmer"]) else None,
            age_group=row["Age"] if not pd.isna(row["Age"]) else None,
            education=row["Education"] if not pd.isna(row["Education"]) else None,
            village=normalize_name(row["Name of the Village"], VILLAGE_NAME_FIXES),
            block=normalize_name(row["Block name"], BLOCK_NAME_FIXES),
            district=row["District name"],
            state=row["State"] if not pd.isna(row["State"]) else None,
        )
        db.add(farmer)
        db.flush()
    cache[farmer_code] = farmer
    return farmer


def import_excel(filepath: str):
    print(f"Reading {filepath} ...")
    df = pd.read_excel(filepath)
    print(f"Found {len(df)} rows.")

    # Creates tables if they don't already exist (no-op if you already ran schema_draft.sql)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    org_cache, emp_cache, farmer_cache = {}, {}, {}
    inserted, skipped = 0, 0

    try:
        for _, row in df.iterrows():
            unique_id = str(row["uniqueID"]) if not pd.isna(row["uniqueID"]) else None

            # Skip rows already imported (safe to re-run the script)
            if unique_id:
                existing = db.query(models.SurveyResponse).filter(
                    models.SurveyResponse.kobo_unique_id == unique_id
                ).first()
                if existing:
                    skipped += 1
                    continue

            org = get_or_create_organization(db, row.get("Name of the Organization"), org_cache)
            emp = get_or_create_employee(db, row.get("Name of the Employee"), row.get("Designation"), org, emp_cache)
            farmer = get_or_create_farmer(db, row, farmer_cache)

            collection_date = row["collectionDate"]
            if pd.isna(collection_date):
                collection_date = None
            elif isinstance(collection_date, str):
                collection_date = pd.to_datetime(collection_date).date()
            else:
                collection_date = collection_date.date() if hasattr(collection_date, "date") else collection_date

            survey = models.SurveyResponse(
                kobo_unique_id=unique_id,
                farmer_id=farmer.id,
                employee_id=emp.id if emp else None,
                collection_date=collection_date,
                survey_year=int(row["Select Year"]) if not pd.isna(row["Select Year"]) else None,
                crop=row["Crop"] if not pd.isna(row["Crop"]) else "Sugarcane",
                crop_type=row["Select Crop Type"] if not pd.isna(row["Select Crop Type"]) else None,
                ratoon_type=row["Select Ratoon Type"] if not pd.isna(row["Select Ratoon Type"]) else None,
                wants_next_ratoon=(row["Do you wish to go for next Ratoon for this crop?"] == "Yes")
                    if not pd.isna(row["Do you wish to go for next Ratoon for this crop?"]) else None,
                was_normal_year=(row["Whether for ${Crop} during ${Year} was a normal year for you in terms of severe climatic events?"] == "Yes")
                    if not pd.isna(row["Whether for ${Crop} during ${Year} was a normal year for you in terms of severe climatic events?"]) else None,
                total_acreage=row["What is the total acreage of the farmer under ${Crop} for the Year ${Year} in Acres?"] if not pd.isna(row["What is the total acreage of the farmer under ${Crop} for the Year ${Year} in Acres?"]) else None,
                largest_plot_acres=row["What is the size of the largest plot of the ${Crop} Crop for the Year ${Year} in Acres?"] if not pd.isna(row["What is the size of the largest plot of the ${Crop} Crop for the Year ${Year} in Acres?"]) else None,
                land_area_hectare=row["LandArea_hectare"] if not pd.isna(row["LandArea_hectare"]) else None,
                irrigation_type=row["What is the type of irrigation in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?"] if not pd.isna(row["What is the type of irrigation in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?"]) else None,
                yield_tonnes=row["What is the Yield from the largest plot for ${Crop} Crop in Tonnes for the Year ${Year}."] if not pd.isna(row["What is the Yield from the largest plot for ${Crop} Crop in Tonnes for the Year ${Year}."]) else None,
                yield_tonnes_per_ha=row["Yield_Tonnes_ha"] if not pd.isna(row["Yield_Tonnes_ha"]) else None,
                total_nutrient_applied=row["tna"] if not pd.isna(row["tna"]) else None,
                gps_latitude=row["_Pleaes take the GPS Coordinates:_latitude"] if "_Pleaes take the GPS Coordinates:_latitude" in row and not pd.isna(row["_Pleaes take the GPS Coordinates:_latitude"]) else None,
                gps_longitude=row["_Pleaes take the GPS Coordinates:_longitude"] if "_Pleaes take the GPS Coordinates:_longitude" in row and not pd.isna(row["_Pleaes take the GPS Coordinates:_longitude"]) else None,
                submitted_via="excel_import",
            )
            db.add(survey)
            db.flush()  # get survey.id

            # Multi-select child rows
            for col, label in CLIMATE_EVENT_COLUMNS:
                if truthy(row.get(col)):
                    db.add(models.ClimateEvent(survey_response_id=survey.id, event_type=label))

            for col, label in CLIMATE_STAGE_COLUMNS:
                if truthy(row.get(col)):
                    db.add(models.ClimateImpactStage(survey_response_id=survey.id, stage=label))

            for col, label in FERT_METHOD_COLUMNS:
                if truthy(row.get(col)):
                    db.add(models.FertilizerApplicationMethod(survey_response_id=survey.id, method=label))

            # Fertilizer/manure usage — long format, only non-null/non-zero values
            for col, label, is_organic in FERTILIZER_COLUMNS:
                qty = row.get(col)
                if qty is not None and not pd.isna(qty) and float(qty) > 0:
                    db.add(models.FertilizerUsage(
                        survey_response_id=survey.id,
                        fertilizer_name=label,
                        quantity_kg=float(qty),
                        is_organic=is_organic,
                    ))

            inserted += 1
            if inserted % 50 == 0:
                db.commit()
                print(f"  ...{inserted} rows committed")

        db.commit()
        print(f"Done. Inserted {inserted} new survey responses, skipped {skipped} already-imported rows.")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python import_excel.py path/to/EDF_SUGARCANE_APPROVED_SURVEY.xlsx")
        sys.exit(1)
    import_excel(sys.argv[1])
