from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.spare_part import SparePart
from app.schemas.spare_part import (
    SparePartCreate,
    SparePartUpdate,
    SparePartResponse
)

router = APIRouter(
    prefix="/api/spare-parts",
    tags=["Spare Parts"]
)


@router.post("/", response_model=SparePartResponse, status_code=201)
def create_spare_part(
    data: SparePartCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(SparePart).filter(
        SparePart.reference == data.reference
    ).first()

    if existing:
        raise HTTPException(409, "Spare part reference already exists")

    spare_part = SparePart(**data.model_dump())
    db.add(spare_part)
    db.commit()
    db.refresh(spare_part)

    return spare_part


@router.get("/", response_model=list[SparePartResponse])
def get_spare_parts(db: Session = Depends(get_db)):
    return db.query(SparePart).order_by(SparePart.id).all()


@router.get("/low-stock", response_model=list[SparePartResponse])
def get_low_stock(db: Session = Depends(get_db)):
    return db.query(SparePart).filter(
        SparePart.quantity <= SparePart.minimum_quantity
    ).order_by(SparePart.quantity).all()


@router.get("/{spare_part_id}", response_model=SparePartResponse)
def get_spare_part(
    spare_part_id: int,
    db: Session = Depends(get_db)
):
    spare_part = db.query(SparePart).filter(
        SparePart.id == spare_part_id
    ).first()

    if not spare_part:
        raise HTTPException(404, "Spare part not found")

    return spare_part


@router.put("/{spare_part_id}", response_model=SparePartResponse)
def update_spare_part(
    spare_part_id: int,
    data: SparePartUpdate,
    db: Session = Depends(get_db)
):
    spare_part = db.query(SparePart).filter(
        SparePart.id == spare_part_id
    ).first()

    if not spare_part:
        raise HTTPException(404, "Spare part not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(spare_part, key, value)

    db.commit()
    db.refresh(spare_part)

    return spare_part


@router.delete("/{spare_part_id}", status_code=204)
def delete_spare_part(
    spare_part_id: int,
    db: Session = Depends(get_db)
):
    spare_part = db.query(SparePart).filter(
        SparePart.id == spare_part_id
    ).first()

    if not spare_part:
        raise HTTPException(404, "Spare part not found")

    db.delete(spare_part)
    db.commit()

    return None