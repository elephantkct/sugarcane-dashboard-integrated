from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    """Equivalent of SURVEY_META in the old static surveyData.ts"""
    q = db.query(models.SurveyResponse).join(models.Farmer)

    total_farmers = db.query(func.count(func.distinct(models.Farmer.id))).scalar()
    total_acres = db.query(func.sum(models.SurveyResponse.total_acreage)).scalar() or 0
    avg_yield = db.query(func.avg(models.SurveyResponse.yield_tonnes_per_ha)).scalar() or 0
    avg_n = db.query(func.avg(models.SurveyResponse.total_nutrient_applied)).scalar() or 0

    plant_crop_count = q.filter(models.SurveyResponse.crop_type == "Plant Crop").count()
    ratoon_count = q.filter(models.SurveyResponse.crop_type == "Ratoon").count()
    total_surveys = q.count()

    block_count = db.query(func.count(func.distinct(models.Farmer.block))).scalar()
    village_count = db.query(func.count(func.distinct(models.Farmer.village))).scalar()

    acknowledged_count = db.query(models.SurveyResponse).filter(
        models.SurveyResponse.acknowledged == True  # noqa: E712
    ).count()

    normal_year_count = q.filter(models.SurveyResponse.was_normal_year == True).count()  # noqa: E712

    return {
        "totalFarmers": total_farmers,
        "totalSurveys": total_surveys,
        "totalAcres": round(float(total_acres), 1),
        "avgYield": round(float(avg_yield), 1),
        "avgNitrogen": round(float(avg_n), 1),
        "plantCropPct": round(100 * plant_crop_count / total_surveys, 0) if total_surveys else 0,
        "ratoonPct": round(100 * ratoon_count / total_surveys, 0) if total_surveys else 0,
        "blockCount": block_count,
        "villageCount": village_count,
        "acknowledgedCount": acknowledged_count,
        "pendingAcknowledgementCount": total_surveys - acknowledged_count,
        "normalYearPct": round(100 * normal_year_count / total_surveys, 0) if total_surveys else 0,
        "stressedYearPct": round(100 * (total_surveys - normal_year_count) / total_surveys, 0) if total_surveys else 0,
    }


@router.get("/villages")
def get_village_data(db: Session = Depends(get_db)):
    """Per-village aggregates: farmer count, acres, avg yield, avg NPK-ish nutrient load."""
    rows = (
        db.query(
            models.Farmer.village,
            models.Farmer.block,
            func.count(func.distinct(models.Farmer.id)).label("farmers"),
            func.sum(models.SurveyResponse.total_acreage).label("acres"),
            func.avg(models.SurveyResponse.yield_tonnes_per_ha).label("yield_avg"),
            func.avg(models.SurveyResponse.total_nutrient_applied).label("tna_avg"),
        )
        .join(models.SurveyResponse, models.SurveyResponse.farmer_id == models.Farmer.id)
        .group_by(models.Farmer.village, models.Farmer.block)
        .all()
    )
    return [
        {
            "village": r.village,
            "block": r.block,
            "farmers": r.farmers,
            "acres": round(float(r.acres or 0), 1),
            "yield": round(float(r.yield_avg or 0), 1),
            "tna": round(float(r.tna_avg or 0), 1),
        }
        for r in rows
    ]


@router.get("/identity")
def get_identity_stats(db: Session = Depends(get_db)):
    """Age distribution + education vs avg yield, for the Identity & Admin page."""
    age_rows = (
        db.query(models.Farmer.age_group, func.count(models.Farmer.id))
        .group_by(models.Farmer.age_group)
        .all()
    )
    edu_rows = (
        db.query(
            models.Farmer.education,
            func.count(func.distinct(models.Farmer.id)),
            func.avg(models.SurveyResponse.yield_tonnes_per_ha),
        )
        .join(models.SurveyResponse, models.SurveyResponse.farmer_id == models.Farmer.id)
        .group_by(models.Farmer.education)
        .all()
    )
    return {
        "ageData": [{"name": a or "Unknown", "value": c} for a, c in age_rows],
        "educationData": [
            {"name": e or "Unknown", "Farmers": c, "AvgYield": round(float(y or 0), 1)}
            for e, c, y in edu_rows
        ],
    }


@router.get("/fertilizer")
def get_fertilizer_stats(db: Session = Depends(get_db)):
    """Total kg used per fertilizer type — replaces the 22-flat-column comparison."""
    rows = (
        db.query(
            models.FertilizerUsage.fertilizer_name,
            models.FertilizerUsage.is_organic,
            func.sum(models.FertilizerUsage.quantity_kg),
        )
        .group_by(models.FertilizerUsage.fertilizer_name, models.FertilizerUsage.is_organic)
        .order_by(func.sum(models.FertilizerUsage.quantity_kg).desc())
        .all()
    )
    return [
        {"name": name, "isOrganic": organic, "totalKg": round(float(total), 1)}
        for name, organic, total in rows
    ]


@router.get("/nitrogen-yield-scatter")
def get_nitrogen_yield_scatter(db: Session = Depends(get_db)):
    """One point per survey response with both nitrogen and yield recorded."""
    rows = (
        db.query(
            models.SurveyResponse.total_nutrient_applied,
            models.SurveyResponse.yield_tonnes_per_ha,
            models.Farmer.name,
        )
        .join(models.Farmer)
        .filter(
            models.SurveyResponse.total_nutrient_applied > 0,
            models.SurveyResponse.yield_tonnes_per_ha > 0,
        )
        .all()
    )
    return [
        {"n": float(n), "yield": float(y), "name": name}
        for n, y, name in rows
    ]


@router.get("/yield-page")
def get_yield_page_data(db: Session = Depends(get_db)):
    """Everything the Yield & Nutrition page needs in one call."""
    rows = (
        db.query(
            models.SurveyResponse.id,
            models.Farmer.name,
            models.Farmer.village,
            models.SurveyResponse.largest_plot_acres,
            models.SurveyResponse.yield_tonnes_per_ha,
            models.SurveyResponse.total_nutrient_applied,
        )
        .join(models.SurveyResponse, models.SurveyResponse.farmer_id == models.Farmer.id)
        .all()
    )

    tna_buckets = {
        "0-50": {"count": 0, "yieldSum": 0.0},
        "50-100": {"count": 0, "yieldSum": 0.0},
        "100-150": {"count": 0, "yieldSum": 0.0},
        "150-200": {"count": 0, "yieldSum": 0.0},
        "> 200": {"count": 0, "yieldSum": 0.0},
    }
    records, scatter_data = [], []
    yield_sum = n_sum = max_yield = 0.0
    count = 0

    for sid, name, village, acres, y, n in rows:
        y = float(y) if y is not None else 0.0
        n = float(n) if n is not None else 0.0
        acres = float(acres) if acres is not None else 0.0

        yield_sum += y
        n_sum += n
        max_yield = max(max_yield, y)
        count += 1

        if n <= 50:
            bucket = "0-50"
        elif n <= 100:
            bucket = "50-100"
        elif n <= 150:
            bucket = "100-150"
        elif n <= 200:
            bucket = "150-200"
        else:
            bucket = "> 200"
        tna_buckets[bucket]["count"] += 1
        tna_buckets[bucket]["yieldSum"] += y

        if acres > 0 and y > 0:
            scatter_data.append({"acres": acres, "yield": y, "name": name})

        records.append({"surveyId": sid, "name": name, "village": village, "acres": acres, "yield": y, "tna": n})

    combo_data = [
        {
            "name": k,
            "Farmers": v["count"],
            "AvgYield": round(v["yieldSum"] / v["count"], 1) if v["count"] else 0,
        }
        for k, v in tna_buckets.items()
    ]

    return {
        "avgYield": round(yield_sum / count, 1) if count else 0,
        "avgN": round(n_sum / count, 1) if count else 0,
        "maxYield": round(max_yield, 1),
        "comboData": combo_data,
        "scatterData": scatter_data,
        "records": records,
    }


@router.get("/identity-page")
def get_identity_page_data(db: Session = Depends(get_db)):
    """Everything the Identity & Admin page needs in one call."""
    rows = (
        db.query(
            models.SurveyResponse.id,
            models.Farmer.farmer_code,
            models.Farmer.name,
            models.Farmer.mobile_number,
            models.Farmer.village,
            models.Farmer.block,
            models.Farmer.age_group,
            models.Farmer.education,
            models.SurveyResponse.collection_date,
            models.SurveyResponse.yield_tonnes_per_ha,
            models.Employee.name.label("employee_name"),
        )
        .join(models.SurveyResponse, models.SurveyResponse.farmer_id == models.Farmer.id)
        .outerjoin(models.Employee, models.SurveyResponse.employee_id == models.Employee.id)
        .all()
    )

    village_counts: dict = {}
    age_counts: dict = {}
    edu_stats: dict = {}
    records = []

    for sid, code, name, mobile, village, block, age, edu, cdate, y, emp_name in rows:
        village = village or "Unknown"
        village_counts[village] = village_counts.get(village, 0) + 1

        age_label = (age or "Unknown").replace("_", " ")
        age_counts[age_label] = age_counts.get(age_label, 0) + 1

        edu_label = edu or "Unknown"
        if edu_label not in edu_stats:
            edu_stats[edu_label] = {"count": 0, "yieldSum": 0.0}
        edu_stats[edu_label]["count"] += 1
        edu_stats[edu_label]["yieldSum"] += float(y) if y is not None else 0.0

        records.append({
            "surveyId": sid,
            "farmerCode": code,
            "name": name,
            "mobileNumber": mobile,
            "collectionDate": cdate.isoformat() if cdate else None,
            "employee": emp_name,
            "village": village,
            "block": block,
        })

    village_data = sorted(
        [{"name": k, "value": v} for k, v in village_counts.items()],
        key=lambda x: -x["value"],
    )[:10]
    top_village = village_data[0]["name"] if village_data else "N/A"

    age_data = [{"name": k, "value": v} for k, v in age_counts.items()]

    edu_data = sorted(
        [
            {"name": k, "Farmers": v["count"], "AvgYield": round(v["yieldSum"] / v["count"], 1) if v["count"] else 0}
            for k, v in edu_stats.items()
        ],
        key=lambda x: -x["Farmers"],
    )
    top_edu = edu_data[0]["name"] if edu_data else "N/A"

    unique_farmer_codes = {r["farmerCode"] for r in records}

    return {
        "totalFarmers": len(unique_farmer_codes),
        "topVillage": top_village,
        "topEdu": top_edu,
        "villageData": village_data,
        "ageData": age_data,
        "eduData": edu_data,
        "records": records,
    }


@router.get("/land-page")
def get_land_page_data(db: Session = Depends(get_db)):
    """Everything the Land Detail page needs in one call."""
    rows = (
        db.query(
            models.SurveyResponse.id,
            models.Farmer.name,
            models.Farmer.village,
            models.SurveyResponse.total_acreage,
            models.SurveyResponse.yield_tonnes_per_ha,
            models.SurveyResponse.irrigation_type,
            models.SurveyResponse.largest_plot_acres,
            models.SurveyResponse.land_area_hectare,
        )
        .join(models.SurveyResponse, models.SurveyResponse.farmer_id == models.Farmer.id)
        .all()
    )

    total_acres = 0.0
    yield_sum = 0.0
    y_buckets = {"< 50": 0, "50-100": 0, "100-150": 0, "> 150": 0}
    irr_stats: dict = {}
    records = []
    count = len(rows)

    for sid, name, village, acres, y, irrigation, plot_acres, land_ha in rows:
        acres = float(acres) if acres is not None else 0.0
        y = float(y) if y is not None else 0.0
        irrigation = irrigation or "Unknown"

        total_acres += acres
        yield_sum += y

        if y < 50:
            y_buckets["< 50"] += 1
        elif y < 100:
            y_buckets["50-100"] += 1
        elif y < 150:
            y_buckets["100-150"] += 1
        else:
            y_buckets["> 150"] += 1

        if irrigation not in irr_stats:
            irr_stats[irrigation] = {"sum": 0.0, "count": 0, "acres": 0.0}
        irr_stats[irrigation]["sum"] += y
        irr_stats[irrigation]["count"] += 1
        irr_stats[irrigation]["acres"] += acres

        records.append({
            "surveyId": sid,
            "name": name,
            "village": village,
            "largestPlotAcres": float(plot_acres) if plot_acres is not None else None,
            "landAreaHa": float(land_ha) if land_ha is not None else None,
        })

    yield_dist_data = [{"name": k, "value": v} for k, v in y_buckets.items()]
    yield_irr_data = sorted(
        [
            {
                "name": k,
                "Farmers": v["count"],
                "TotalAcres": round(v["acres"]),
                "AvgYield": round(v["sum"] / v["count"], 1) if v["count"] else 0,
            }
            for k, v in irr_stats.items()
        ],
        key=lambda x: -x["TotalAcres"],
    )

    return {
        "totalAcres": round(total_acres, 1),
        "avgPlot": round(total_acres / count, 1) if count else 0,
        "avgYield": round(yield_sum / count, 1) if count else 0,
        "yieldDistData": yield_dist_data,
        "yieldIrrData": yield_irr_data,
        "records": records,
    }


@router.get("/analytics-raw")
def get_analytics_raw(db: Session = Depends(get_db)):
    """Raw per-survey rows for client-side correlation/quadrant analysis on the Advanced Analytics page."""
    rows = (
        db.query(
            models.SurveyResponse.id,
            models.Farmer.farmer_code,
            models.Farmer.name,
            models.Farmer.village,
            models.SurveyResponse.yield_tonnes_per_ha,
            models.SurveyResponse.total_nutrient_applied,
            models.SurveyResponse.total_acreage,
        )
        .join(models.Farmer, models.SurveyResponse.farmer_id == models.Farmer.id)
        .all()
    )
    return [
        {
            "surveyId": sid,
            "id": code,
            "name": name,
            "village": village or "Unknown",
            "yield": float(y) if y is not None else 0.0,
            "n": float(n) if n is not None else 0.0,
            "acres": float(acres) if acres is not None else 0.0,
        }
        for sid, code, name, village, y, n, acres in rows
    ]


@router.get("/farmer-locations")
def get_farmer_locations(db: Session = Depends(get_db)):
    """Real per-farmer GPS points captured during the survey, for the District Map."""
    rows = (
        db.query(
            models.SurveyResponse.id,
            models.Farmer.name,
            models.Farmer.village,
            models.Farmer.block,
            models.SurveyResponse.gps_latitude,
            models.SurveyResponse.gps_longitude,
            models.SurveyResponse.yield_tonnes_per_ha,
            models.SurveyResponse.total_acreage,
        )
        .join(models.Farmer, models.SurveyResponse.farmer_id == models.Farmer.id)
        .filter(
            models.SurveyResponse.gps_latitude.isnot(None),
            models.SurveyResponse.gps_longitude.isnot(None),
        )
        .all()
    )
    return [
        {
            "surveyId": sid,
            "name": name,
            "village": village,
            "block": block,
            "lat": float(lat),
            "lng": float(lng),
            "yield": float(y) if y is not None else 0.0,
            "acres": float(acres) if acres is not None else 0.0,
        }
        for sid, name, village, block, lat, lng, y, acres in rows
    ]


@router.get("/climate")
def get_climate_stats(db: Session = Depends(get_db)):
    """Frequency of each climate event type."""
    rows = (
        db.query(models.ClimateEvent.event_type, func.count(models.ClimateEvent.id))
        .group_by(models.ClimateEvent.event_type)
        .all()
    )
    return [{"name": name, "count": count} for name, count in rows]


CORE_FERTILIZERS = ["Urea", "DAP", "MOP"]


@router.get("/fertilizer-page")
def get_fertilizer_page_data(db: Session = Depends(get_db)):
    """Everything the Fertilizer Method page needs in one call."""
    core_rows = (
        db.query(models.FertilizerUsage.fertilizer_name, func.sum(models.FertilizerUsage.quantity_kg))
        .filter(models.FertilizerUsage.fertilizer_name.in_(CORE_FERTILIZERS))
        .group_by(models.FertilizerUsage.fertilizer_name)
        .all()
    )
    fert_totals = {name: float(total) for name, total in core_rows}
    fert_data = sorted(
        [{"name": n, "value": fert_totals.get(n, 0)} for n in CORE_FERTILIZERS],
        key=lambda x: -x["value"],
    )

    method_rows = (
        db.query(models.FertilizerApplicationMethod.method, func.count(models.FertilizerApplicationMethod.id))
        .group_by(models.FertilizerApplicationMethod.method)
        .all()
    )
    method_data = sorted([{"name": m, "value": c} for m, c in method_rows], key=lambda x: -x["value"])

    avg_n = db.query(func.avg(models.SurveyResponse.total_nutrient_applied)).scalar() or 0

    methods_by_survey: dict = {}
    for sid, m in db.query(
        models.FertilizerApplicationMethod.survey_response_id, models.FertilizerApplicationMethod.method
    ).all():
        methods_by_survey.setdefault(sid, []).append(m)

    base_rows = (
        db.query(models.SurveyResponse.id, models.Farmer.name, models.Farmer.village)
        .join(models.Farmer, models.SurveyResponse.farmer_id == models.Farmer.id)
        .all()
    )
    records = [
        {"surveyId": sid, "name": name, "village": village, "method": " ".join(methods_by_survey.get(sid, [])) or "Unknown"}
        for sid, name, village in base_rows
    ]

    return {
        "fertData": fert_data,
        "methData": method_data,
        "avgN": round(float(avg_n), 1),
        "records": records,
    }


@router.get("/ratoon-page")
def get_ratoon_page_data(db: Session = Depends(get_db)):
    """Everything the Ratoon Planning page needs in one call."""
    rows = (
        db.query(
            models.SurveyResponse.id,
            models.Farmer.name,
            models.Farmer.village,
            models.SurveyResponse.crop_type,
            models.SurveyResponse.ratoon_type,
            models.SurveyResponse.wants_next_ratoon,
            models.SurveyResponse.yield_tonnes_per_ha,
        )
        .join(models.SurveyResponse, models.SurveyResponse.farmer_id == models.Farmer.id)
        .all()
    )

    rt_counts: dict = {}
    next_stats = {"Yes": {"count": 0, "yieldSum": 0.0}, "No / Undecided": {"count": 0, "yieldSum": 0.0}}
    ratoon_count = 0
    records = []
    total = len(rows)

    for sid, name, village, crop_type, ratoon_type, wants_next, y in rows:
        y = float(y) if y is not None else 0.0
        is_ratoon = crop_type == "Ratoon"
        if is_ratoon:
            ratoon_count += 1
        label = ratoon_type if (is_ratoon and ratoon_type) else "Plant Crop"
        rt_counts[label] = rt_counts.get(label, 0) + 1

        key = "Yes" if wants_next else "No / Undecided"
        next_stats[key]["count"] += 1
        next_stats[key]["yieldSum"] += y

        records.append({
            "surveyId": sid,
            "name": name,
            "village": village,
            "crop": crop_type or "Unknown",
            "wishNextRatoon": "Yes" if wants_next else "No",
        })

    rt_data = sorted([{"name": k, "value": v} for k, v in rt_counts.items()], key=lambda x: -x["value"])
    next_data = [
        {
            "name": k,
            "Farmers": v["count"],
            "AvgYield": round(v["yieldSum"] / v["count"], 1) if v["count"] else 0,
        }
        for k, v in next_stats.items()
    ]

    return {
        "rtData": rt_data,
        "nextData": next_data,
        "pctRatoon": round(100 * ratoon_count / total) if total else 0,
        "pctNext": round(100 * next_stats["Yes"]["count"] / total) if total else 0,
        "records": records,
    }


STAGE_LABELS = {"grand_growth": "Grand Growth", "sprouting": "Sprouting", "tillering": "Tillering", "maturity": "Maturity"}


@router.get("/climate-page")
def get_climate_page_data(db: Session = Depends(get_db)):
    """Everything the Climate Detail page needs in one call."""
    total = db.query(models.SurveyResponse).count()
    normal_count = db.query(models.SurveyResponse).filter(
        models.SurveyResponse.was_normal_year == True  # noqa: E712
    ).count()

    event_rows = (
        db.query(models.ClimateEvent.event_type, func.count(models.ClimateEvent.id))
        .group_by(models.ClimateEvent.event_type)
        .all()
    )
    event_counts = {name.replace("_", " "): c for name, c in event_rows}
    surveys_with_events = db.query(
        func.count(func.distinct(models.ClimateEvent.survey_response_id))
    ).scalar() or 0
    event_counts["None"] = total - surveys_with_events

    ev_data = sorted(
        [{"name": k, "value": v} for k, v in event_counts.items() if v > 0],
        key=lambda x: -x["value"],
    )
    top_stress = next((d["name"] for d in ev_data if d["name"] != "None"), "None")

    stage_rows = (
        db.query(models.ClimateImpactStage.stage, func.count(models.ClimateImpactStage.id))
        .group_by(models.ClimateImpactStage.stage)
        .all()
    )
    st_data = sorted(
        [{"name": STAGE_LABELS.get(s, s), "value": c} for s, c in stage_rows if c > 0],
        key=lambda x: -x["value"],
    )

    events_by_survey: dict = {}
    for sid, ev in db.query(models.ClimateEvent.survey_response_id, models.ClimateEvent.event_type).all():
        events_by_survey.setdefault(sid, []).append(ev.replace("_", " "))

    stages_by_survey: dict = {}
    for sid, stg in db.query(models.ClimateImpactStage.survey_response_id, models.ClimateImpactStage.stage).all():
        stages_by_survey.setdefault(sid, []).append(STAGE_LABELS.get(stg, stg))

    base_rows = (
        db.query(models.SurveyResponse.id, models.Farmer.name, models.Farmer.village)
        .join(models.Farmer, models.SurveyResponse.farmer_id == models.Farmer.id)
        .all()
    )
    records = [
        {
            "surveyId": sid,
            "name": name,
            "village": village,
            "severeEvents": ", ".join(events_by_survey.get(sid, [])) or "None",
            "growthStage": ", ".join(stages_by_survey.get(sid, [])) or "-",
        }
        for sid, name, village in base_rows
    ]

    return {
        "evData": ev_data,
        "stData": st_data,
        "pctNormal": round(100 * normal_count / total) if total else 0,
        "topStress": top_stress,
        "records": records,
    }


LONG_TAIL_FERTILIZERS = [
    "SSP", "NPK 10-26-26", "NPK 12-32-16", "NPS 20-20-0-13", "Ammonium Sulphate",
    "Ammonium Chloride", "NPK 17-17-17", "NPKS-16-20-0-13", "NPK-16-16-16",
    "NPK-12-61-0", "NPKS-15-15-15-09", "NPK-19-19-19", "Mono 11-52-0", "Calcium Ammonium Nitrate",
]
LONG_TAIL_LABELS = {
    "Ammonium Sulphate": "Amm. Sulphate",
    "Ammonium Chloride": "Amm. Chloride",
    "NPKS-16-20-0-13": "NPKS 16-20-0-13",
    "NPK-16-16-16": "NPK 16-16-16",
    "NPK-12-61-0": "NPK 12-61-0",
    "NPKS-15-15-15-09": "NPKS 15-15-15-09",
    "NPK-19-19-19": "NPK 19-19-19",
    "Calcium Ammonium Nitrate": "CAN",
}


@router.get("/longtail-fertilizer-page")
def get_longtail_fertilizer_page(db: Session = Depends(get_db)):
    """Everything the Long-tail Fertilizers page needs in one call."""
    usage_rows = (
        db.query(
            models.FertilizerUsage.survey_response_id,
            models.FertilizerUsage.fertilizer_name,
            models.FertilizerUsage.quantity_kg,
        )
        .filter(models.FertilizerUsage.fertilizer_name.in_(LONG_TAIL_FERTILIZERS))
        .all()
    )
    counts: dict = {}
    by_survey: dict = {}
    farmers_using = set()
    for sid, name, qty in usage_rows:
        label = LONG_TAIL_LABELS.get(name, name)
        counts[label] = counts.get(label, 0) + 1
        by_survey.setdefault(sid, {})[label] = float(qty)
        farmers_using.add(sid)

    chart_data = sorted([{"name": k, "value": v} for k, v in counts.items()], key=lambda x: -x["value"])

    base_rows = (
        db.query(models.SurveyResponse.id, models.Farmer.name)
        .join(models.Farmer, models.SurveyResponse.farmer_id == models.Farmer.id)
        .filter(models.SurveyResponse.id.in_(list(farmers_using)))
        .all()
    ) if farmers_using else []

    key_cols = ["SSP", "NPK 10-26-26", "Amm. Sulphate", "NPK 17-17-17", "CAN"]
    records = [
        {"surveyId": sid, "name": name, **{col: by_survey.get(sid, {}).get(col) for col in key_cols}}
        for sid, name in base_rows
    ]

    return {
        "chartData": chart_data,
        "top": chart_data[0]["name"] if chart_data else "None",
        "usingAny": len(farmers_using),
        "records": records,
    }


LONG_TAIL_ORGANICS = ["Vermicompost", "Goat/Sheep Manure", "Poultry Manure", "Jeevamrut/GhanaJivamrut"]
ORG_LABELS = {"Jeevamrut/GhanaJivamrut": "Jeevamrut / GhanaJivamrut"}


@router.get("/longtail-organic-page")
def get_longtail_organic_page(db: Session = Depends(get_db)):
    """Everything the Long-tail Organics page needs in one call."""
    usage_rows = (
        db.query(
            models.FertilizerUsage.survey_response_id,
            models.FertilizerUsage.fertilizer_name,
            models.FertilizerUsage.quantity_kg,
        )
        .filter(models.FertilizerUsage.fertilizer_name.in_(LONG_TAIL_ORGANICS))
        .all()
    )
    counts: dict = {}
    by_survey: dict = {}
    total_vol = 0.0
    for sid, name, qty in usage_rows:
        label = ORG_LABELS.get(name, name)
        qty = float(qty)
        counts[label] = counts.get(label, 0) + 1
        by_survey.setdefault(sid, {})[name] = qty
        total_vol += qty

    chart_data = sorted([{"name": k, "value": v} for k, v in counts.items()], key=lambda x: -x["value"])

    base_rows = (
        db.query(models.SurveyResponse.id, models.Farmer.name)
        .join(models.Farmer, models.SurveyResponse.farmer_id == models.Farmer.id)
        .filter(models.SurveyResponse.id.in_(list(by_survey.keys())))
        .all()
    ) if by_survey else []

    records = [
        {
            "surveyId": sid,
            "name": name,
            "vermicompost": by_survey.get(sid, {}).get("Vermicompost"),
            "goatSheepManure": by_survey.get(sid, {}).get("Goat/Sheep Manure"),
            "poultryManure": by_survey.get(sid, {}).get("Poultry Manure"),
            "jeevamrut": by_survey.get(sid, {}).get("Jeevamrut/GhanaJivamrut"),
        }
        for sid, name in base_rows
    ]

    return {
        "chartData": chart_data,
        "top": chart_data[0]["name"] if chart_data else "None",
        "vol": round(total_vol, 1),
        "records": records,
    }
