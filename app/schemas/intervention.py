
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class InterventionType(str, Enum):
    PREVENTIVE = "PREVENTIVE"
    CORRECTIVE = "CORRECTIVE"


class InterventionPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class InterventionStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class InterventionCreate(BaseModel):
    equipment_id: int
    title: str = Field(min_length=3, max_length=150)
    description: Optional[str] = None
    intervention_type: InterventionType
    priority: InterventionPriority = InterventionPriority.MEDIUM
    assigned_to: Optional[str] = None
    scheduled_date: Optional[datetime] = None


class InterventionUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3)
    description: Optional[str] = None
    priority: Optional[InterventionPriority] = None
    status: Optional[InterventionStatus] = None
    assigned_to: Optional[str] = None
    scheduled_date: Optional[datetime] = None


class InterventionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    equipment_id: int
    title: str
    description: Optional[str]
    intervention_type: str
    priority: str
    status: str
    assigned_to: Optional[str]
    scheduled_date: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
