
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.equipment import Equipment
from app.models.intervention import Intervention
from app.models.spare_part import SparePart


def count_by_field(rows):
    """Convert grouped database results into a dictionary."""
    return {
        str(value or "UNKNOWN").upper(): count
        for value, count in rows
    }


def get_dashboard_data(db: Session):
    """Retrieve maintenance dashboard statistics."""

    # 1. Equipment statistics
    total_equipments = db.query(Equipment).count()

    equipment_status = db.query(
        Equipment.status,
        func.count(Equipment.id)
    ).group_by(Equipment.status).all()

    # 2. Intervention statistics
    total_interventions = db.query(Intervention).count()

    intervention_status = db.query(
        Intervention.status,
        func.count(Intervention.id)
    ).group_by(Intervention.status).all()

    intervention_types = db.query(
        Intervention.intervention_type,
        func.count(Intervention.id)
    ).group_by(Intervention.intervention_type).all()

    intervention_priorities = db.query(
        Intervention.priority,
        func.count(Intervention.id)
    ).group_by(Intervention.priority).all()

    # 3. MTTR calculation (in hours)
    completed_interventions = db.query(Intervention).filter(
        Intervention.started_at.isnot(None),
        Intervention.completed_at.isnot(None),
        Intervention.completed_at >= Intervention.started_at
    ).all()

    durations = [
        (
            intervention.completed_at - intervention.started_at
        ).total_seconds() / 3600
        for intervention in completed_interventions
    ]

    mttr_hours = (
        round(sum(durations) / len(durations), 2)
        if durations else None
    )

    # 4. Spare parts statistics
    total_spare_parts = db.query(SparePart).count()

    low_stock_items = db.query(SparePart).filter(
        SparePart.quantity <= SparePart.minimum_quantity
    ).all()

    spare_parts = db.query(SparePart).all()

    total_stock_value = sum(
        part.quantity * (part.unit_price or 0)
        for part in spare_parts
    )

    # 5. Dashboard response
    return {
        "equipment": {
            "total": total_equipments,
            "by_status": count_by_field(equipment_status)
        },

        "interventions": {
            "total": total_interventions,
            "by_status": count_by_field(intervention_status),
            "by_type": count_by_field(intervention_types),
            "by_priority": count_by_field(intervention_priorities),
            "mttr_hours": mttr_hours,
            "mttr_sample_size": len(durations)
        },

        "spare_parts": {
            "total": total_spare_parts,
            "low_stock_count": len(low_stock_items),
            "total_stock_value": round(total_stock_value, 2),
            "low_stock_items": [
                {
                    "reference": part.reference,
                    "name": part.name,
                    "quantity": part.quantity,
                    "minimum_quantity": part.minimum_quantity,
                    "location": part.location
                }
                for part in low_stock_items
            ]
        }
    }
