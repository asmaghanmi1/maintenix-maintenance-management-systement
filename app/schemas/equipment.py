
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class EquipmentCreate(BaseModel):
    code: str = Field(min_length=2, max_length=30)
    name: str = Field(min_length=2, max_length=100)
    zone: str = Field(min_length=2, max_length=50)
    category: str = Field(min_length=2, max_length=50)
    status: str = "OPERATIONAL"
    criticality: str = "MEDIUM"
    description: Optional[str] = None


class EquipmentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    zone: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    criticality: Optional[str] = None
    description: Optional[str] = None


class EquipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    zone: str
    category: str
    status: str
    criticality: str
    description: Optional[str] = None
