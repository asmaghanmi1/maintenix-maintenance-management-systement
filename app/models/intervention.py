
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.database import Base


class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, index=True)

    reference = Column(String(30), unique=True, nullable=False, index=True)

    equipment_id = Column(
        Integer,
        ForeignKey("equipment.id"),
        nullable=False
    )

    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)

    intervention_type = Column(String(20), nullable=False)
    priority = Column(String(20), default="MEDIUM")
    status = Column(String(20), default="OPEN")

    assigned_to = Column(String(100), nullable=True)

    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
