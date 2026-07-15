from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional


class FarmerBase(BaseModel):
    farmer_code: str
    name: str
    mobile_number: Optional[str] = None
    age_group: Optional[str] = None
    education: Optional[str] = None
    village: Optional[str] = None
    block: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None


class FarmerCreate(FarmerBase):
    pass


class FarmerOut(FarmerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class FertilizerUsageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    fertilizer_name: str
    quantity_kg: float
    is_organic: bool


class SurveyResponseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    kobo_unique_id: Optional[str] = None
    farmer_id: int
    collection_date: Optional[date] = None
    survey_year: Optional[int] = None
    crop: Optional[str] = None
    crop_type: Optional[str] = None
    ratoon_type: Optional[str] = None
    wants_next_ratoon: Optional[bool] = None
    was_normal_year: Optional[bool] = None
    total_acreage: Optional[float] = None
    largest_plot_acres: Optional[float] = None
    land_area_hectare: Optional[float] = None
    irrigation_type: Optional[str] = None
    yield_tonnes: Optional[float] = None
    yield_tonnes_per_ha: Optional[float] = None
    total_nutrient_applied: Optional[float] = None
    acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    submitted_via: str
    fertilizer_usage: list[FertilizerUsageOut] = []


class FarmerDetailOut(FarmerOut):
    survey_responses: list[SurveyResponseOut] = []


class AcknowledgeRequest(BaseModel):
    acknowledged_by: str
