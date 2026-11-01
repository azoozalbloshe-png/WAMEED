from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ContractStatus(str, Enum):
    """Contract status enum"""
    ACTIVE = "active"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class MeterType(str, Enum):
    """Meter type enum - نوع العداد"""
    ELECTRICITY = "electricity"  # الكهرباء
    WATER = "water"  # الماء


# ==================== Property Schemas ====================

class PropertyBase(BaseModel):
    """Base schema for Property"""
    name: str = Field(..., min_length=1, max_length=255, description="Property name")
    address: str = Field(..., min_length=1, max_length=255, description="Property address")


class PropertyCreate(PropertyBase):
    """Schema for creating a new Property"""
    pass


class PropertyResponse(PropertyBase):
    """Schema for Property response"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PropertyListResponse(BaseModel):
    """Schema for listing properties"""
    total: int
    properties: list[PropertyResponse]


# ==================== Unit Schemas ====================

class UnitBase(BaseModel):
    """Base schema for Unit"""
    property_id: int = Field(..., description="Property ID")
    unit_number: str = Field(..., min_length=1, max_length=50, description="Unit number")


class UnitCreate(UnitBase):
    """Schema for creating a new Unit"""
    pass


class UnitResponse(UnitBase):
    """Schema for Unit response"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UnitListResponse(BaseModel):
    """Schema for listing units"""
    total: int
    units: list[UnitResponse]


# ==================== Tenant Schemas ====================

class TenantBase(BaseModel):
    """Base schema for Tenant"""
    name: str = Field(..., min_length=1, max_length=255, description="Tenant name")
    phone: str = Field(..., min_length=1, max_length=50, description="Tenant phone number")


class TenantCreate(TenantBase):
    """Schema for creating a new Tenant"""
    pass


class TenantResponse(TenantBase):
    """Schema for Tenant response"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TenantListResponse(BaseModel):
    """Schema for listing tenants"""
    total: int
    tenants: list[TenantResponse]


# ==================== Contract Schemas ====================

class ContractBase(BaseModel):
    """Base schema for Contract"""
    unit_id: int = Field(..., description="Unit ID")
    tenant_id: int = Field(..., description="Tenant ID")
    amount: int = Field(..., gt=0, description="Contract amount")
    due_date: datetime = Field(..., description="Due date for payment")


class ContractCreate(ContractBase):
    """Schema for creating a new Contract"""
    pass


class ContractResponse(ContractBase):
    """Schema for Contract response"""
    id: int
    status: ContractStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ContractListResponse(BaseModel):
    """Schema for listing contracts"""
    total: int
    contracts: list[ContractResponse]


# ==================== Meter Schemas ====================

class MeterBase(BaseModel):
    """Base schema for Meter"""
    unit_id: int = Field(..., description="Unit ID")
    meter_type: MeterType = Field(..., description="Meter type")
    meter_number: str = Field(..., min_length=1, max_length=50, description="Meter number")


class MeterCreate(MeterBase):
    """Schema for creating a new Meter"""
    pass


class MeterResponse(MeterBase):
    """Schema for Meter response"""
    id: int
    last_reading_date: datetime
    last_attempt_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MeterListResponse(BaseModel):
    """Schema for listing meters"""
    total: int
    meters: list[MeterResponse]


# ==================== Meter Bill Schemas ====================

class MeterBillResponse(BaseModel):
    """Schema for Meter Bill response"""
    id: int
    meter_id: int
    consumption: int
    tier1_amount: float
    tier2_amount: float
    service_fee: float
    vat: float
    total_amount: float
    calculation_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class MeterBillListResponse(BaseModel):
    """Schema for listing meter bills"""
    total: int
    bills: list[MeterBillResponse]


# ==================== Common Responses ====================

class MessageResponse(BaseModel):
    """Common success message response"""
    message: str
    data: Optional[dict] = None