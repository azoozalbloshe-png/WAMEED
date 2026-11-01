from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import property_router, unit_router, tenant_router, contract_router, meter_router, bill_router

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="Real Estate Management API",
    description="API for managing properties, units, tenants, contracts, meters, and bills",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(property_router)
app.include_router(unit_router)
app.include_router(tenant_router)
app.include_router(contract_router)
app.include_router(meter_router)
app.include_router(bill_router)


@app.get("/")
def read_root():
    return {"status": "ok"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}