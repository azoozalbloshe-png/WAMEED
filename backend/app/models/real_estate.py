from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ContractStatus(str, enum.Enum):
    """Enumeration of contract status values."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class SubscriptionTier(str, enum.Enum):
    """Enumeration of subscription tier values."""
    BASIC = "basic"
    STANDARD = "standard"
    PREMIUM = "premium"


class PropertyType(str, enum.Enum):
    """Enumeration of property type values."""
    APARTMENT = "apartment"
    VILLA = "villa"
    TOWNHOUSE = "townhouse"
    COMMERCIAL = "commercial"


class Property(Base):
    """Property model representing real estate properties."""
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    property_type = Column(SQLEnum(PropertyType), nullable=False)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    area = Column(String(100), nullable=True)
    floor = Column(Integer, nullable=True)
    total_units = Column(Integer, default=0)
    occupied_units = Column(Integer, default=0)
    monthly_rent = Column(Float, default=0.0)
    status = Column(SQLEnum(ContractStatus), default=ContractStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tenants = relationship("Tenant", back_populates="property", cascade="all, delete-orphan")
    contracts = relationship("Contract", back_populates="property", cascade="all, delete-orphan")
    meters = relationship("Meter", back_populates="property", cascade="all, delete-orphan")


class Tenant(Base):
    """Tenant model representing property tenants."""
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    national_id = Column(String(50), nullable=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    contract_start_date = Column(DateTime(timezone=True), nullable=False)
    contract_end_date = Column(DateTime(timezone=True), nullable=False)
    monthly_rent = Column(Float, default=0.0)
    deposit_amount = Column(Float, default=0.0)
    status = Column(SQLEnum(ContractStatus), default=ContractStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    property = relationship("Property", back_populates="tenants")
    contracts = relationship("Contract", back_populates="tenant", cascade="all, delete-orphan")


class MeterReadingType(str, enum.Enum):
    """Enumeration of meter reading type values."""
    ELECTRICITY = "electricity"
    WATER = "water"
    GAS = "gas"


class Meter(Base):
    """Meter model representing utility meters for properties."""
    __tablename__ = "meters"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    meter_type = Column(SQLEnum(MeterReadingType), nullable=False)
    meter_number = Column(String(50), nullable=False, unique=True)
    current_reading = Column(Float, default=0.0)
    previous_reading = Column(Float, default=0.0)
    is_locked = Column(Boolean, default=False)
    lock_until = Column(DateTime(timezone=True), nullable=True)
    subscription_tier = Column(SQLEnum(SubscriptionTier), default=SubscriptionTier.BASIC)
    total_calculations = Column(Integer, default=0)  # Track calculation attempts
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    property = relationship("Property", back_populates="meters")
    readings = relationship("MeterReading", back_populates="meter", cascade="all, delete-orphan")


class MeterReading(Base):
    """MeterReading model representing individual reading records."""
    __tablename__ = "meter_readings"

    id = Column(Integer, primary_key=True, index=True)
    meter_id = Column(Integer, ForeignKey("meters.id"), nullable=False)
    reading_date = Column(DateTime(timezone=True), server_default=func.now())
    current_reading = Column(Float, nullable=False)
    previous_reading = Column(Float, nullable=False)
    units_consumed = Column(Float, nullable=False)
    tier1_units = Column(Float, default=0.0)  # Units in Tier 1 (first 2 units)
    tier2_units = Column(Float, default=0.0)  # Units in Tier 2 (additional units)
    cost_before_tax = Column(Float, nullable=False)  # Cost before tax (18 + 30 + 10)
    tax_amount = Column(Float, nullable=False)  # 15% tax
    total_cost = Column(Float, nullable=False)  # Final cost
    calculated_by = Column(String(100), nullable=True)  # Username who calculated
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    meter = relationship("Meter", back_populates="readings")
