
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from uuid import uuid4

from app.database import get_db
from app.models.equipment import Equipment
from app.models.intervention import Intervention
from app.schemas.intervention import (
    InterventionCreate,
    InterventionUpdate,
    InterventionResponse,
    InterventionStatus
)

router = APIRouter(
    prefix="/api/interventions",
    tags=["Interventions"]
)


@router.post("/", response_model=InterventionResponse, status_code=201)
def create_intervention(
    data: InterventionCreate,
    db: Session = Depends(get_db)
):
    equipment = db.query(Equipment).filter(
        Equipment.id == data.equipment_id
    ).first()

    if not equipment:
        raise HTTPException(404, "Equipment not found")

    intervention = Intervention(
        reference=f"INT-{uuid4().hex[:8].upper()}",
        **data.model_dump()
    )

    db.add(intervention)
    db.commit()
    db.refresh(intervention)

    return intervention


@router.get("/", response_model=list[InterventionResponse])
def get_interventions(db: Session = Depends(get_db)):
    return db.query(Intervention).order_by(
        Intervention.id.desc()
    ).all()


@router.get("/{intervention_id}", response_model=InterventionResponse)
def get_intervention(
    intervention_id: int,
    db: Session = Depends(get_db)
):
    intervention = db.query(Intervention).filter(
        Intervention.id == intervention_id
    ).first()

    if not intervention:
        raise HTTPException(404, "Intervention not found")

    return intervention


@router.put("/{intervention_id}", response_model=InterventionResponse)
def update_intervention(
    intervention_id: int,
    data: InterventionUpdate,
    db: Session = Depends(get_db)
):
    intervention = db.query(Intervention).filter(
        Intervention.id == intervention_id
    ).first()

    if not intervention:
        raise HTTPException(404, "Intervention not found")

    updates = data.model_dump(exclude_unset=True)

    if updates.get("status") == InterventionStatus.IN_PROGRESS:
        intervention.started_at = datetime.now(timezone.utc)

    if updates.get("status") == InterventionStatus.COMPLETED:
        intervention.completed_at = datetime.now(timezone.utc)

    for key, value in updates.items():
        setattr(intervention, key, value)

    db.commit()
    db.refresh(intervention)

    return intervention


@router.delete("/{intervention_id}", status_code=204)
def delete_intervention(
    intervention_id: int,
    db: Session = Depends(get_db)
):
    intervention = db.query(Intervention).filter(
        Intervention.id == intervention_id
    ).first()

    if not intervention:
        raise HTTPException(404, "Intervention not found")

    db.delete(intervention)
    db.commit()

    return None
