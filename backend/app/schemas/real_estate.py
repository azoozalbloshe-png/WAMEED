from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from app.models.real_estate import (
    PropertyType,
    ContractStatus,
    SubscriptionTier,
    MeterReadingType
)


# Subscription Tier Info Schema
class SubscriptionTierInfo(BaseModel):
    """Schema for subscription tier information."""
    tier: SubscriptionTier
    name: str
    price_multiplier: float = 1.0
    description: str


# Subscription Info Schema
class SubscriptionInfo(BaseModel):
    """Schema for subscription information."""
    property_id: int
    property_name: str
    meter_count: int
    tier: str
    base_cost: float
    service_fee: float
    tax_amount: float
    total_cost: float


# Property Schemas
class PropertyBase(BaseModel):
    """Base schema for property data."""
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    property_type: PropertyType
    address: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    floor: Optional[int] = None
    total_units: int = Field(default=0, ge=0)
    monthly_rent: float = Field(default=0.0, ge=0)


class PropertyCreate(PropertyBase):
    """Schema for creating a new property."""
    pass


class PropertyUpdate(BaseModel):
    """Schema for updating a property."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    property_type: Optional[PropertyType] = None
    address: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    floor: Optional[int] = None
    total_units: Optional[int] = Field(None, ge=0)
    monthly_rent: Optional[float] = Field(None, ge=0)


class PropertyResponse(PropertyBase):
    """Schema for property response."""
    id: int
    occupied_units: int = 0
    status: ContractStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Tenant Schemas
class TenantBase(BaseModel):
    """Base schema for tenant data."""
    name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    national_id: Optional[str] = Field(None, max_length=50)
    property_id: int = Field(..., gt=0)
    contract_start_date: datetime
    contract_end_date: datetime
    monthly_rent: float = Field(default=0.0, ge=0)
    deposit_amount: float = Field(default=0.0, ge=0)


class TenantCreate(TenantBase):
    """Schema for creating a new tenant."""
    pass


class TenantUpdate(BaseModel):
    """Schema for updating a tenant."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    national_id: Optional[str] = Field(None, max_length=50)
    monthly_rent: Optional[float] = Field(None, ge=0)
    deposit_amount: Optional[float] = Field(None, ge=0)


class TenantResponse(TenantBase):
    """Schema for tenant response."""
    id: int
    property: Optional[PropertyResponse] = None
    status: ContractStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Meter Schemas
class MeterBase(BaseModel):
    """Base schema for meter data."""
    property_id: int = Field(..., gt=0)
    meter_type: MeterReadingType
    meter_number: str = Field(..., min_length=1, max_length=50)


class MeterCreate(MeterBase):
    """Schema for creating a new meter."""
    pass


class MeterUpdate(BaseModel):
    """Schema for updating a meter."""
    meter_type: Optional[MeterReadingType] = None
    current_reading: Optional[float] = Field(None, ge=0)
    subscription_tier: Optional[SubscriptionTier] = None


class MeterResponse(MeterBase):
    """Schema for meter response."""
    id: int
    property: Optional[PropertyResponse] = None
    current_reading: float = 0
    previous_reading: float = 0
    is_locked: bool = False
    lock_until: Optional[datetime] = None
    subscription_tier: SubscriptionTier
    total_calculations: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Meter Reading Schemas
class MeterReadingBase(BaseModel):
    """Base schema for meter reading."""
    current_reading: float = Field(..., ge=0)
    previous_reading: float = Field(..., ge=0)


class MeterReadingCreate(MeterReadingBase):
    """Schema for creating a new meter reading."""
    meter_id: int = Field(..., gt=0)
    notes: Optional[str] = None


class MeterReadingResponse(MeterReadingBase):
    """Schema for meter reading response."""
    id: int
    meter: Optional[MeterResponse] = None
    reading_date: datetime
    units_consumed: float
    cost_before_tax: float
    tax_amount: float
    total_cost: float
    calculated_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Tier Breakdown Schema
class TierBreakdown(BaseModel):
    """Schema for tier breakdown."""
    tier_name: str
    price_per_unit: float
    units: float
    cost: float
    is_primary: bool = False


# Calculation Result Schema
class CalculationResult(BaseModel):
    """Schema for calculation result with tier breakdown."""
    meter_id: int
    meter_number: str
    meter_name: str
    meter_type: str
    previous_reading: float
    current_reading: float
    units_consumed: float
    cost_before_tax: float
    tax_amount: float
    total_cost: float
    subscription_tier: SubscriptionTier
    is_locked: bool
    remaining_attempts: Optional[int] = None
    lock_expiry_date: Optional[datetime] = None
    tier_breakdown: list[TierBreakdown]

    class Config:
        from_attributes = True
