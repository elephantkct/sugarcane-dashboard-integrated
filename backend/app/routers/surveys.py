from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/surveys", tags=["surveys"])


@router.get("/{survey_id}/profile")
def get_survey_profile(survey_id: int, db: Session = Depends(get_db)):
    """Full detail for the Farmer Profile modal — one survey response, fully named."""
    survey = (
        db.query(models.SurveyResponse)
        .options(joinedload(models.SurveyResponse.fertilizer_usage))
        .filter(models.SurveyResponse.id == survey_id)
        .first()
    )
    if not survey:
        raise HTTPException(status_code=404, detail="Survey response not found")

    farmer = survey.farmer
    employee = survey.employee

    events = (
        db.query(models.ClimateEvent.event_type)
        .filter(models.ClimateEvent.survey_response_id == survey_id)
        .all()
    )
    stages = (
        db.query(models.ClimateImpactStage.stage)
        .filter(models.ClimateImpactStage.survey_response_id == survey_id)
        .all()
    )
    methods = (
        db.query(models.FertilizerApplicationMethod.method)
        .filter(models.FertilizerApplicationMethod.survey_response_id == survey_id)
        .all()
    )

    fert_usage = {f.fertilizer_name: float(f.quantity_kg) for f in survey.fertilizer_usage if not f.is_organic}
    organic_usage = {f.fertilizer_name: float(f.quantity_kg) for f in survey.fertilizer_usage if f.is_organic}

    return {
        "surveyId": survey.id,
        "koboUniqueId": survey.kobo_unique_id,
        "farmerCode": farmer.farmer_code,
        "name": farmer.name,
        "mobileNumber": farmer.mobile_number,
        "state": farmer.state,
        "district": farmer.district,
        "block": farmer.block,
        "village": farmer.village,
        "crop": survey.crop,
        "collectionDate": survey.collection_date.isoformat() if survey.collection_date else None,
        "employeeName": employee.name if employee else None,
        "employeeDesignation": employee.designation if employee else None,
        "largestPlotAcres": float(survey.largest_plot_acres) if survey.largest_plot_acres is not None else None,
        "landAreaHectare": float(survey.land_area_hectare) if survey.land_area_hectare is not None else None,
        "wantsNextRatoon": survey.wants_next_ratoon,
        "yieldTonnesPerHa": float(survey.yield_tonnes_per_ha) if survey.yield_tonnes_per_ha is not None else None,
        "totalNutrientApplied": float(survey.total_nutrient_applied) if survey.total_nutrient_applied is not None else None,
        "fertilizerMethod": " ".join(m[0] for m in methods) or None,
        "severeClimaticEvents": ", ".join(e[0].replace("_", " ") for e in events) or "None",
        "growthStageImpacted": ", ".join(s[0].replace("_", " ") for s in stages) or None,
        "fertilizerUsage": fert_usage,
        "organicUsage": organic_usage,
        "acknowledged": survey.acknowledged,
        "acknowledgedBy": survey.acknowledged_by,
    }


@router.get("/", response_model=list[schemas.SurveyResponseOut])
def list_surveys(
    skip: int = 0,
    limit: int = 500,
    year: int | None = None,
    village: str | None = None,
    block: str | None = None,
    acknowledged: bool | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.SurveyResponse).options(
        joinedload(models.SurveyResponse.fertilizer_usage)
    ).join(models.Farmer)

    if year is not None:
        query = query.filter(models.SurveyResponse.survey_year == year)
    if village:
        query = query.filter(models.Farmer.village == village)
    if block:
        query = query.filter(models.Farmer.block == block)
    if acknowledged is not None:
        query = query.filter(models.SurveyResponse.acknowledged == acknowledged)

    return query.offset(skip).limit(limit).all()


@router.get("/{survey_id}", response_model=schemas.SurveyResponseOut)
def get_survey(survey_id: int, db: Session = Depends(get_db)):
    survey = db.query(models.SurveyResponse).options(
        joinedload(models.SurveyResponse.fertilizer_usage)
    ).filter(models.SurveyResponse.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey response not found")
    return survey


@router.patch("/{survey_id}/acknowledge", response_model=schemas.SurveyResponseOut)
def acknowledge_survey(
    survey_id: int, payload: schemas.AcknowledgeRequest, db: Session = Depends(get_db)
):
    """Officials call this to mark a survey record as reviewed/acknowledged."""
    survey = db.query(models.SurveyResponse).filter(
        models.SurveyResponse.id == survey_id
    ).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey response not found")

    survey.acknowledged = True
    survey.acknowledged_by = payload.acknowledged_by
    survey.acknowledged_at = datetime.utcnow()
    db.commit()
    db.refresh(survey)
    return survey


@router.patch("/{survey_id}/unacknowledge", response_model=schemas.SurveyResponseOut)
def unacknowledge_survey(survey_id: int, db: Session = Depends(get_db)):
    """Undo an acknowledgement, in case it was marked by mistake."""
    survey = db.query(models.SurveyResponse).filter(
        models.SurveyResponse.id == survey_id
    ).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey response not found")

    survey.acknowledged = False
    survey.acknowledged_by = None
    survey.acknowledged_at = None
    db.commit()
    db.refresh(survey)
    return survey
