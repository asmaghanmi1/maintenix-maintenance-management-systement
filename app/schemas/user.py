
from pydantic import BaseModel, Field
from typing import Literal


UserRole = Literal[
    "ADMIN",
    "MAINTENANCE_MANAGER",
    "TECHNICIAN"
]


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=150)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = "TECHNICIAN"


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    is_active: bool

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
