from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Numeric
from sqlalchemy.sql import func
from database import Base
import enum


class ContractStatus(str, enum.Enum):
    """Contract status enum"""
    ACTIVE = "active"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class MeterType(str, enum.Enum):
    """Meter type enum - نوع العداد"""
    ELECTRICITY = "electricity"  # الكهرباء
    WATER = "water"  # الماء


class Property(Base):
    """Property table - العقارات"""
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    address = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Unit(Base):
    """Unit table - الوحدات العقارية"""
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, nullable=False)
    unit_number = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Tenant(Base):
    """Tenant table - المستأجرين"""
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Contract(Base):
    """Contract table - العقود والدفعات"""
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, nullable=False)
    tenant_id = Column(Integer, nullable=False)
    amount = Column(Integer, nullable=False)  # Amount in currency units
    due_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(ContractStatus), default=ContractStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Meter(Base):
    """Meter table - عدادات الكهرباء والماء"""
    __tablename__ = "meters"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    meter_type = Column(Enum(MeterType), nullable=False)  # electricity or water
    meter_number = Column(String(50), nullable=False, unique=True)
    last_reading_date = Column(DateTime(timezone=True), nullable=False)
    last_attempt_count = Column(Integer, default=0)  # عدد محاولات الحساب
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class MeterBill(Base):
    """MeterBill table - فواتير العدادات"""
    __tablename__ = "meter_bills"

    id = Column(Integer, primary_key=True, index=True)
    meter_id = Column(Integer, ForeignKey("meters.id"), nullable=False)
    consumption = Column(Integer, nullable=False)  # الاستهلاك بالوحدات
    tier1_amount = Column(Numeric(10, 2), nullable=False)  # المبلغ للشريحة الأولى
    tier2_amount = Column(Numeric(10, 2), nullable=False)  # المبلغ للشريحة الثانية
    service_fee = Column(Numeric(10, 2), nullable=False)  # رسوم الخدمة
    vat = Column(Numeric(10, 2), nullable=False)  # الضريبة
    total_amount = Column(Numeric(10, 2), nullable=False)  # المبلغ الإجمالي
    calculation_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())