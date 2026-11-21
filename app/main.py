
from fastapi import FastAPI

from app.database import Base, engine
from app.models import Equipment, Intervention, SparePart
from app.routers.auth import router as auth_router
from app.routers.equipment import router as equipment_router
from app.routers.interventions import router as interventions_router
from app.routers.spare_parts import router as spare_parts_router
from app.routers.dashboard import router as dashboard_router

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI application
app = FastAPI(
    title="Maintenance Management System",
    description="Maintenance, equipment, spare parts and dashboard management",
    version="1.0.0"
)

# Register API routers
app.include_router(auth_router)
app.include_router(equipment_router)
app.include_router(interventions_router)
app.include_router(spare_parts_router)
app.include_router(dashboard_router)


@app.get("/")
def home():
    return {
        "application": "Maintenance Management System",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
