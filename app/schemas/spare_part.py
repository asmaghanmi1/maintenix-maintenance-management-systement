from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class SparePartCreate(BaseModel):
    reference: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=120)
    category: str = Field(min_length=2, max_length=60)
    quantity: int = Field(default=0, ge=0)
    minimum_quantity: int = Field(default=5, ge=0)
    unit_price: Optional[float] = Field(default=None, ge=0)
    location: Optional[str] = None


class SparePartUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    category: Optional[str] = None
    quantity: Optional[int] = Field(default=None, ge=0)
    minimum_quantity: Optional[int] = Field(default=None, ge=0)
    unit_price: Optional[float] = Field(default=None, ge=0)
    location: Optional[str] = None


class SparePartResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    name: str
    category: str
    quantity: int
    minimum_quantity: int
    unit_price: Optional[float]
    location: Optional[str]