from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/farmers", tags=["farmers"])


@router.get("/", response_model=list[schemas.FarmerOut])
def list_farmers(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    return db.query(models.Farmer).offset(skip).limit(limit).all()


@router.get("/{farmer_id}", response_model=schemas.FarmerDetailOut)
def get_farmer(farmer_id: int, db: Session = Depends(get_db)):
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return farmer


@router.post("/", response_model=schemas.FarmerOut, status_code=201)
def create_farmer(farmer: schemas.FarmerCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Farmer).filter(
        models.Farmer.farmer_code == farmer.farmer_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Farmer code already exists")
    db_farmer = models.Farmer(**farmer.model_dump())
    db.add(db_farmer)
    db.commit()
    db.refresh(db_farmer)
    return db_farmer


@router.put("/{farmer_id}", response_model=schemas.FarmerOut)
def update_farmer(farmer_id: int, farmer: schemas.FarmerCreate, db: Session = Depends(get_db)):
    db_farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not db_farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    for key, value in farmer.model_dump().items():
        setattr(db_farmer, key, value)
    db.commit()
    db.refresh(db_farmer)
    return db_farmer


@router.delete("/{farmer_id}", status_code=204)
def delete_farmer(farmer_id: int, db: Session = Depends(get_db)):
    db_farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not db_farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    db.delete(db_farmer)
    db.commit()
    return None
