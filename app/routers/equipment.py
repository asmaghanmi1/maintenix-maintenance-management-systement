
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.equipment import Equipment
from app.schemas.equipment import (
    EquipmentCreate,
    EquipmentUpdate,
    EquipmentResponse
)

router = APIRouter(prefix="/api/equipment", tags=["Equipment"])


@router.post("/", response_model=EquipmentResponse, status_code=201)
def create_equipment(data: EquipmentCreate, db: Session = Depends(get_db)):
    existing = db.query(Equipment).filter(
        Equipment.code == data.code
    ).first()

    if existing:
        raise HTTPException(409, "Equipment code already exists")

    equipment = Equipment(**data.model_dump())
    db.add(equipment)
    db.commit()
    db.refresh(equipment)
    return equipment


@router.get("/", response_model=list[EquipmentResponse])
def get_equipments(
    zone: str = Query(None),
    status: str = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Equipment)

    if zone:
        query = query.filter(Equipment.zone == zone)

    if status:
        query = query.filter(Equipment.status == status)

    return query.order_by(Equipment.id).all()


@router.get("/{equipment_id}", response_model=EquipmentResponse)
def get_equipment(equipment_id: int, db: Session = Depends(get_db)):
    equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id
    ).first()

    if not equipment:
        raise HTTPException(404, "Equipment not found")

    return equipment


@router.put("/{equipment_id}", response_model=EquipmentResponse)
def update_equipment(
    equipment_id: int,
    data: EquipmentUpdate,
    db: Session = Depends(get_db)
):
    equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id
    ).first()

    if not equipment:
        raise HTTPException(404, "Equipment not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(equipment, key, value)

    db.commit()
    db.refresh(equipment)
    return equipment


@router.delete("/{equipment_id}", status_code=204)
def delete_equipment(equipment_id: int, db: Session = Depends(get_db)):
    equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id
    ).first()

    if not equipment:
        raise HTTPException(404, "Equipment not found")

    db.delete(equipment)
    db.commit()
    return None
