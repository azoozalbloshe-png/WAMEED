from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.schemas.real_estate import (
    PropertyCreate,
    PropertyUpdate,
    PropertyResponse,
    TenantCreate,
    TenantUpdate,
    TenantResponse,
    MeterCreate,
    MeterUpdate,
    MeterResponse,
    MeterReadingCreate,
    MeterReadingResponse,
    SubscriptionTierInfo,
    SubscriptionInfo,
    CalculationResult,
)
from app.services.real_estate_service import RealEstateService
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token
from fastapi.security import OAuth2PasswordRequestForm
from app.routers.auth import get_current_active_user

router = APIRouter(prefix="/api/real-estate", tags=["Real Estate"])


# ==================== Property Endpoints ====================

@router.post("/properties", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
def create_property(
    property_data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new property.
    Requires authentication.
    """
    service = RealEstateService(db)
    return service.create_property(property_data)


@router.get("/properties", response_model=List[PropertyResponse])
def get_properties(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all properties with pagination.
    Requires authentication.
    """
    service = RealEstateService(db)
    return service.get_all_properties(skip=skip, limit=limit)


@router.get("/properties/{property_id}", response_model=PropertyResponse)
def get_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific property by ID.
    Requires authentication.
    """
    service = RealEstateService(db)
    property_obj = service.get_property(property_id)
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    return property_obj


@router.put("/properties/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: int,
    property_data: PropertyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an existing property.
    Requires authentication.
    """
    service = RealEstateService(db)
    property_obj = service.update_property(property_id, property_data)
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    return property_obj


@router.delete("/properties/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a property.
    Requires authentication.
    """
    service = RealEstateService(db)
    if not service.delete_property(property_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    return None


@router.get("/properties/{property_id}/stats")
def get_property_stats(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get statistics for a property.
    Requires authentication.
    """
    service = RealEstateService(db)
    return service.get_property_stats(property_id)


# ==================== Tenant Endpoints ====================

@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant_data: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new tenant.
    Requires authentication.
    """
    service = RealEstateService(db)
    return service.create_tenant(tenant_data)


@router.get("/tenants", response_model=List[TenantResponse])
def get_tenants(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all tenants with pagination.
    Requires authentication.
    """
    service = RealEstateService(db)
    tenants = service.db.query(Tenant).offset(skip).limit(limit).all()
    return tenants


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific tenant by ID.
    Requires authentication.
    """
    service = RealEstateService(db)
    tenant_obj = service.get_tenant(tenant_id)
    if not tenant_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return tenant_obj


@router.get("/properties/{property_id}/tenants", response_model=List[TenantResponse])
def get_tenants_by_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all tenants for a specific property.
    Requires authentication.
    """
    service = RealEstateService(db)
    return service.get_tenants_by_property(property_id)


@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: int,
    tenant_data: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an existing tenant.
    Requires authentication.
    """
    service = RealEstateService(db)
    tenant_obj = service.update_tenant(tenant_id, tenant_data)
    if not tenant_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return tenant_obj


@router.delete("/tenants/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a tenant.
    Requires authentication.
    """
    service = RealEstateService(db)
    if not service.delete_tenant(tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return None


# ==================== Meter Endpoints ====================

@router.post("/meters", response_model=MeterResponse, status_code=status.HTTP_201_CREATED)
def create_meter(
    meter_data: MeterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new meter.
    Requires authentication.
    """
    service = RealEstateService(db)
    return service.create_meter(meter_data)


@router.get("/meters", response_model=List[MeterResponse])
def get_meters(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all meters with pagination.
    Requires authentication.
    """
    service = RealEstateService(db)
    return service.db.query(Meter).offset(skip).limit(limit).all()


@router.get("/meters/{meter_id}", response_model=MeterResponse)
def get_meter(
    meter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific meter by ID.
    Requires authentication.
    """
    service = RealEstateService(db)
    meter_obj = service.get_meter(meter_id)
    if not meter_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meter not found"
        )
    return meter_obj


@router.get("/properties/{property_id}/meters", response_model=List[MeterResponse])
def get_meters_by_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all meters for a specific property.
    Requires authentication.
    """
    service = RealEstateService(db)
    return service.get_meters_by_property(property_id)


@router.put("/meters/{meter_id}", response_model=MeterResponse)
def update_meter(
    meter_id: int,
    meter_data: MeterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an existing meter.
    Requires authentication.
    """
    service = RealEstateService(db)
    meter_obj = service.update_meter(meter_id, meter_data)
    if not meter_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meter not found"
        )
    return meter_obj


@router.delete("/meters/{meter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meter(
    meter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a meter.
    Requires authentication.
    """
    service = RealEstateService(db)
    if not service.delete_meter(meter_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meter not found"
        )
    return None

# ==================== Tenant Endpoints ====================

@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant_data: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new tenant.
    Requires authentication.
    """
    service = RealEstateService(db)
    return service.create_tenant(tenant_data)


@router.get("/tenants", response_model=List[TenantResponse])
def get_tenants(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all tenants with pagination.
    Requires authentication.
    """
    service = RealEstateService(db)
    tenants = service.db.query(Tenant).offset(skip).limit(limit).all()
    return tenants


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific tenant by ID.
    Requires authentication.
    """
    service = RealEstateService(db)
    tenant_obj = service.get_tenant(tenant_id)
    if not tenant_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return tenant_obj


@router.get("/properties/{property_id}/tenants", response_model=List[TenantResponse])
def get_tenants_by_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all tenants for a specific property.
    Requires authentication.
    """
    service = RealEstateService(db)
    return service.get_tenants_by_property(property_id)


@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: int,
    tenant_data: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an existing tenant.
    Requires authentication.
    """
    service = RealEstateService(db)
    tenant_obj = service.update_tenant(tenant_id, tenant_data)
    if not tenant_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return tenant_obj


@router.delete("/tenants/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a tenant.
    Requires authentication.
    """
    service = RealEstateService(db)
    if not service.delete_tenant(tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return None

# ==================== Meter Reading Endpoints ====================

@router.post("/meters/{meter_id}/calculate", response_model=CalculationResult)
def calculate_meter_reading(
    meter_id: int,
    reading_data: MeterReadingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Calculate meter reading with subscription pricing logic.
    
    Pricing: First 2 meters: 175 SAR, Additional: 35 SAR, Service fee: 10 SAR, Tax: 15%
    After 2 attempts, meter locks for 30 days.
    
    Requires authentication.
    """
    service = RealEstateService(db)
    
    try:
        reading_obj, meter_obj = service.calculate_meter_reading(
            meter_id=meter_id,
            current_reading=reading_data.current_reading,
            calculated_by=current_user.username
        )
        
        tier_breakdown = []
        tier_breakdown.append(TierBreakdown(
            tier_name="Tier 1 - Primary",
            price_per_unit=0.18,
            units=reading_obj.units_consumed,
            cost=reading_obj.cost_before_tax,
            is_primary=True
        ))
        tier_breakdown.append(TierBreakdown(
            tier_name="Tier 2 - Secondary",
            price_per_unit=0.30,
            units=0,
            cost=0,
            is_primary=False
        ))
        
        return CalculationResult(
            meter_id=meter_obj.id,
            meter_name=meter_obj.meter_number,
            meter_type=meter_obj.meter_type.value,
            previous_reading=meter_obj.previous_reading,
            current_reading=reading_obj.current_reading,
            units_consumed=reading_obj.units_consumed,
            cost_before_tax=reading_obj.cost_before_tax,
            tax_amount=reading_obj.tax_amount,
            total_cost=reading_obj.total_cost,
            subscription_tier=meter_obj.subscription_tier.value,
            is_locked=meter_obj.is_locked,
            remaining_attempts=2 - meter_obj.total_calculations if not meter_obj.is_locked else 0,
            lock_expiry_date=meter_obj.lock_until,
            tier_breakdown=tier_breakdown
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/meters/{meter_id}/readings", response_model=List[MeterReadingResponse])
def get_meter_readings(
    meter_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all readings for a specific meter.
    Requires authentication.
    """
    service = RealEstateService(db)
    return service.get_meter_readings(meter_id=meter_id, skip=skip, limit=limit)


@router.get("/meters/{meter_id}/latest-reading")
def get_latest_meter_reading(
    meter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the latest reading for a specific meter.
    Requires authentication.
    """
    service = RealEstateService(db)
    reading_obj = service.get_latest_reading(meter_id)
    if not reading_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No readings found for this meter"
        )
    return reading_obj


# ==================== Subscription Endpoints ====================

@router.get("/subscription/tiers")
def get_all_subscription_tiers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all subscription pricing tiers.
    Requires authentication.
    """
    service = RealEstateService(db)
    return service.get_all_subscription_tiers()


@router.get("/subscription/calculate")
def calculate_subscription_cost(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Calculate subscription cost for a property.
    Requires authentication.
    """
    service = RealEstateService(db)
    return service.calculate_subscription_cost(property_id)
 
