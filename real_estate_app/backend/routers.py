from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
from models import Property, Unit, Tenant, Contract, Meter, MeterBill
from schemas import (
    PropertyCreate, PropertyResponse, PropertyListResponse,
    UnitCreate, UnitResponse, UnitListResponse,
    TenantCreate, TenantResponse, TenantListResponse,
    ContractCreate, ContractResponse, ContractListResponse,
    MeterCreate, MeterResponse, MeterListResponse,
    MeterBillResponse, MeterBillListResponse,
    MessageResponse
)
from bills import calculate_meter_bill, create_meter_bill_record

# Create routers
property_router = APIRouter(prefix="/properties", tags=["Properties"])
unit_router = APIRouter(prefix="/units", tags=["Units"])
tenant_router = APIRouter(prefix="/tenants", tags=["Tenants"])
contract_router = APIRouter(prefix="/contracts", tags=["Contracts"])
meter_router = APIRouter(prefix="/meters", tags=["Meters"])
bill_router = APIRouter(prefix="/bills", tags=["Bills"])


# ==================== Property Routes ====================

@property_router.get("/", response_model=PropertyListResponse)
async def get_properties(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all properties"""
    properties = db.query(Property).offset(skip).limit(limit).all()
    total = db.query(Property).count()
    return PropertyListResponse(total=total, properties=properties)


@property_router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: int, db: Session = Depends(get_db)):
    """Get a specific property by ID"""
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    return property


@property_router.post("/", response_model=PropertyResponse, status_code=201)
async def create_property(property_data: PropertyCreate, db: Session = Depends(get_db)):
    """Create a new property"""
    property = Property(
        name=property_data.name,
        address=property_data.address
    )
    db.add(property)
    db.commit()
    db.refresh(property)
    return property


# ==================== Unit Routes ====================

@unit_router.get("/", response_model=UnitListResponse)
async def get_units(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all units"""
    units = db.query(Unit).offset(skip).limit(limit).all()
    total = db.query(Unit).count()
    return UnitListResponse(total=total, units=units)


@unit_router.get("/{unit_id}", response_model=UnitResponse)
async def get_unit(unit_id: int, db: Session = Depends(get_db)):
    """Get a specific unit by ID"""
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return unit


@unit_router.post("/", response_model=UnitResponse, status_code=201)
async def create_unit(unit_data: UnitCreate, db: Session = Depends(get_db)):
    """Create a new unit"""
    unit = Unit(
        property_id=unit_data.property_id,
        unit_number=unit_data.unit_number
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


# ==================== Tenant Routes ====================

@tenant_router.get("/", response_model=TenantListResponse)
async def get_tenants(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all tenants"""
    tenants = db.query(Tenant).offset(skip).limit(limit).all()
    total = db.query(Tenant).count()
    return TenantListResponse(total=total, tenants=tenants)


@tenant_router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(tenant_id: int, db: Session = Depends(get_db)):
    """Get a specific tenant by ID"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@tenant_router.post("/", response_model=TenantResponse, status_code=201)
async def create_tenant(tenant_data: TenantCreate, db: Session = Depends(get_db)):
    """Create a new tenant"""
    tenant = Tenant(
        name=tenant_data.name,
        phone=tenant_data.phone
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


# ==================== Contract Routes ====================

@contract_router.get("/", response_model=ContractListResponse)
async def get_contracts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all contracts"""
    contracts = db.query(Contract).offset(skip).limit(limit).all()
    total = db.query(Contract).count()
    return ContractListResponse(total=total, contracts=contracts)


@contract_router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(contract_id: int, db: Session = Depends(get_db)):
    """Get a specific contract by ID"""
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract


@contract_router.post("/", response_model=ContractResponse, status_code=201)
async def create_contract(contract_data: ContractCreate, db: Session = Depends(get_db)):
    """Create a new contract"""
    contract = Contract(
        unit_id=contract_data.unit_id,
        tenant_id=contract_data.tenant_id,
        amount=contract_data.amount,
        due_date=contract_data.due_date
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract


# ==================== Meter Routes ====================

@meter_router.get("/", response_model=MeterListResponse)
async def get_meters(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all meters"""
    meters = db.query(Meter).offset(skip).limit(limit).all()
    total = db.query(Meter).count()
    return MeterListResponse(total=total, meters=meters)


@meter_router.get("/{meter_id}", response_model=MeterResponse)
async def get_meter(meter_id: int, db: Session = Depends(get_db)):
    """Get a specific meter by ID"""
    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if not meter:
        raise HTTPException(status_code=404, detail="Meter not found")
    return meter


@meter_router.post("/", response_model=MeterResponse, status_code=201)
async def create_meter(meter_data: MeterCreate, db: Session = Depends(get_db)):
    """Create a new meter"""
    # Check if meter number already exists
    existing = db.query(Meter).filter(Meter.meter_number == meter_data.meter_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Meter number already exists")
    
    # Check if unit exists
    unit = db.query(Unit).filter(Unit.id == meter_data.unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    meter = Meter(
        unit_id=meter_data.unit_id,
        meter_type=meter_data.meter_type,
        meter_number=meter_data.meter_number,
        last_reading_date=datetime.now()
    )
    db.add(meter)
    db.commit()
    db.refresh(meter)
    return meter


# ==================== Bill Routes ====================

@bill_router.get("/", response_model=MeterBillListResponse)
async def get_bills(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all bills"""
    bills = db.query(MeterBill).offset(skip).limit(limit).all()
    total = db.query(MeterBill).count()
    return MeterBillListResponse(total=total, bills=bills)


@bill_router.get("/{bill_id}", response_model=MeterBillResponse)
async def get_bill(bill_id: int, db: Session = Depends(get_db)):
    """Get a specific bill by ID"""
    bill = db.query(MeterBill).filter(MeterBill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill


@bill_router.post("/calculate")
async def calculate_bill_endpoint(request: dict, db: Session = Depends(get_db)):
    """Calculate a bill for a meter"""
    meter_id = request.get("meter_id")
    consumption = request.get("consumption")
    
    if not meter_id or not consumption:
        raise HTTPException(status_code=400, detail="meter_id and consumption are required")
    
    if consumption <= 0:
        raise HTTPException(status_code=400, detail="consumption must be greater than zero")
    
    result = calculate_meter_bill(db, meter_id, consumption)
    return result.to_dict()


@bill_router.post("/create")
async def create_bill_endpoint(request: dict, db: Session = Depends(get_db)):
    """Create a bill record for a meter"""
    meter_id = request.get("meter_id")
    consumption = request.get("consumption")
    
    if not meter_id or not consumption:
        raise HTTPException(status_code=400, detail="meter_id and consumption are required")
    
    if consumption <= 0:
        raise HTTPException(status_code=400, detail="consumption must be greater than zero")
    
    bill = create_meter_bill_record(db, meter_id, consumption)
    if not bill:
        raise HTTPException(status_code=400, detail="Failed to create bill record. Check calculation limits.")
    
    return {
        "success": True,
        "bill_id": bill.id,
        "total_amount": float(bill.total_amount),
        "message": "Bill created successfully"
    }