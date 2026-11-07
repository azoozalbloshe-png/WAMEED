from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, LargeBinary, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base

class Unit(Base):
    __tablename__ = 'property_units'
    __table_args__ = (UniqueConstraint('property_id', 'number', name='uq_property_unit_number'),)
    id = Column(Integer, primary_key=True)
    customer_account_id = Column(Integer, ForeignKey('customer_accounts.id'), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey('properties.id'), nullable=False, index=True)
    number = Column(String(50), nullable=False)
    floor = Column(String(50))
    description = Column(Text)
    status = Column(String(20), nullable=False, default='available')
    created_at = Column(DateTime, server_default=func.now())
    archived_at = Column(DateTime)

class MaintenanceRequest(Base):
    __tablename__ = 'maintenance_requests'
    id = Column(Integer, primary_key=True)
    customer_account_id = Column(Integer, ForeignKey('customer_accounts.id'), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey('properties.id'), nullable=False, index=True)
    unit_id = Column(Integer, ForeignKey('property_units.id'))
    title = Column(String(150), nullable=False)
    description = Column(Text)
    priority = Column(String(20), nullable=False, default='normal')
    status = Column(String(20), nullable=False, default='open')
    due_date = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    archived_at = Column(DateTime)

class Attachment(Base):
    __tablename__ = 'record_attachments'
    id = Column(Integer, primary_key=True)
    customer_account_id = Column(Integer, ForeignKey('customer_accounts.id'), nullable=False, index=True)
    resource = Column(String(20), nullable=False)
    record_id = Column(Integer, nullable=False, index=True)
    filename = Column(String(180), nullable=False)
    content_type = Column(String(50), nullable=False)
    content = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class AuthAttempt(Base):
    __tablename__ = 'auth_attempts'
    id = Column(Integer, primary_key=True)
    identity_hash = Column(String(64), nullable=False, index=True)
    client_hash = Column(String(64), nullable=False, index=True)
    action = Column(String(20), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
