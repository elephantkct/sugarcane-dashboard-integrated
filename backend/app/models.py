from sqlalchemy import (
    Column, Integer, String, Numeric, Boolean, Date, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True)
    name = Column(String(150), unique=True, nullable=False)

    employees = relationship("Employee", back_populates="organization")


class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    designation = Column(String(100))
    organization_id = Column(Integer, ForeignKey("organizations.id"))

    organization = relationship("Organization", back_populates="employees")


class Farmer(Base):
    __tablename__ = "farmers"
    id = Column(Integer, primary_key=True)
    farmer_code = Column(String(50), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    mobile_number = Column(String(100))
    age_group = Column(String(30))
    education = Column(String(50))
    village = Column(String(100))
    block = Column(String(100))
    district = Column(String(100))
    state = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())

    survey_responses = relationship("SurveyResponse", back_populates="farmer")


class SurveyResponse(Base):
    __tablename__ = "survey_responses"
    id = Column(Integer, primary_key=True)
    kobo_unique_id = Column(String(50), unique=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"))

    collection_date = Column(Date)
    survey_year = Column(Integer)
    crop = Column(String(50), default="Sugarcane")
    crop_type = Column(String(30))
    ratoon_type = Column(String(30))
    wants_next_ratoon = Column(Boolean)

    was_normal_year = Column(Boolean)

    total_acreage = Column(Numeric(10, 2))
    largest_plot_acres = Column(Numeric(10, 2))
    land_area_hectare = Column(Numeric(10, 4))
    irrigation_type = Column(String(50))

    yield_tonnes = Column(Numeric(10, 2))
    yield_tonnes_per_ha = Column(Numeric(10, 2))
    total_nutrient_applied = Column(Numeric(10, 3))

    gps_latitude = Column(Numeric(10, 7))
    gps_longitude = Column(Numeric(10, 7))

    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String(150))
    acknowledged_at = Column(DateTime)

    submitted_via = Column(String(20), default="excel_import")
    created_at = Column(DateTime, server_default=func.now())

    farmer = relationship("Farmer", back_populates="survey_responses")
    employee = relationship("Employee")
    climate_events = relationship("ClimateEvent", cascade="all, delete-orphan")
    climate_impact_stages = relationship("ClimateImpactStage", cascade="all, delete-orphan")
    fertilizer_methods = relationship("FertilizerApplicationMethod", cascade="all, delete-orphan")
    fertilizer_usage = relationship("FertilizerUsage", cascade="all, delete-orphan")


class ClimateEvent(Base):
    __tablename__ = "climate_events"
    id = Column(Integer, primary_key=True)
    survey_response_id = Column(Integer, ForeignKey("survey_responses.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(50), nullable=False)


class ClimateImpactStage(Base):
    __tablename__ = "climate_impact_stages"
    id = Column(Integer, primary_key=True)
    survey_response_id = Column(Integer, ForeignKey("survey_responses.id", ondelete="CASCADE"), nullable=False)
    stage = Column(String(30), nullable=False)


class FertilizerApplicationMethod(Base):
    __tablename__ = "fertilizer_application_methods"
    id = Column(Integer, primary_key=True)
    survey_response_id = Column(Integer, ForeignKey("survey_responses.id", ondelete="CASCADE"), nullable=False)
    method = Column(String(50), nullable=False)


class FertilizerUsage(Base):
    __tablename__ = "fertilizer_usage"
    id = Column(Integer, primary_key=True)
    survey_response_id = Column(Integer, ForeignKey("survey_responses.id", ondelete="CASCADE"), nullable=False)
    fertilizer_name = Column(String(80), nullable=False)
    quantity_kg = Column(Numeric(10, 2), nullable=False)
    is_organic = Column(Boolean, default=False)
