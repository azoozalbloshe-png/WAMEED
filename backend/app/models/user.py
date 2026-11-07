import secrets
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default='user', nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    email_verified_at = Column(DateTime, nullable=True)
    phone_verified_at = Column(DateTime, nullable=True)
    full_name = Column(String(150), nullable=True)
    phone = Column(String(30), nullable=True)
    customer_account_id = Column(Integer, ForeignKey("customer_accounts.id"), nullable=True, index=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    failed_login_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    token_version = Column(Integer, nullable=False, default=lambda: secrets.randbelow(2**30) + 1)


class CustomerAccount(Base):
    """A customer's private workspace; distinct from a real estate tenant."""
    __tablename__ = "customer_accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String(20), nullable=False, default="active")
    subscription_tier = Column(String(30), nullable=False, default="basic")
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    customer_account_id = Column(Integer, ForeignKey("customer_accounts.id"), nullable=True, index=True)
    action = Column(String(80), nullable=False)
    target_type = Column(String(80), nullable=True)
    target_id = Column(String(80), nullable=True)
    details = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class PasswordReset(Base):
    __tablename__ = "password_resets"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False)
    issued_email = Column(String(254), nullable=True)
    issued_phone = Column(String(30), nullable=True)
    user_version = Column(Integer, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)


class RolePolicy(Base):
    __tablename__ = "role_policies"
    role = Column(String(30), primary_key=True)
    permissions = Column(JSON, nullable=False)


class VerificationChallenge(Base):
    __tablename__ = "verification_challenges"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    channel = Column(String(10), nullable=False)
    destination = Column(String(254), nullable=False)
    token_hash = Column(String(64), nullable=True, unique=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    attempts = Column(Integer, default=0, nullable=False)


class RecoveryRequest(Base):
    __tablename__ = "recovery_requests"
    id = Column(Integer, primary_key=True)
    request_hash = Column(String(64), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    method = Column(String(10), nullable=False)
    destination = Column(String(254), nullable=False)
    destination_hash = Column(String(64), nullable=False, index=True)
    client_hash = Column(String(64), nullable=False, index=True)
    user_version = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    attempts = Column(Integer, nullable=False, default=0)
