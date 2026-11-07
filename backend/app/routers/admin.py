from datetime import datetime
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models.user import User, CustomerAccount, AuditLog, RolePolicy
from app.models.real_estate import Property, Contract, Tenant, Meter, MeterReading, RentPayment, PropertyExpense
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.routers.auth import get_current_superuser
from app.permissions import ALL, DEFAULTS

router = APIRouter(prefix='/api/admin', dependencies=[Depends(get_current_superuser)])
Role = Literal['admin', 'manager', 'accountant', 'employee']

class CreateUser(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=10, max_length=72)
    full_name: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=30)
    role: Role = 'admin'
    customer_account_id: Optional[int] = None

class UpdateUser(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=30)
    role: Role
    is_active: bool

class Policy(BaseModel):
    permissions: list[str]

class Password(BaseModel):
    password: str = Field(min_length=10, max_length=72)


def audit(db, actor, action, target):
    db.add(AuditLog(actor_user_id=actor.id, customer_account_id=target.customer_account_id, action=action, target_type='user', target_id=str(target.id)))


def target_user(db, user_id):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, 'User not found.')
    return user


def mutable(user, actor):
    if user.id == actor.id or user.is_superuser or user.role == 'super_admin':
        raise HTTPException(403, 'The platform owner account cannot be edited or deleted from this panel.')


def commit(db):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'This username or email is already in use.')

class AdminUserResponse(UserResponse):
    can_delete: bool
    deletion_reason: Optional[str] = None


def deletion_blocker(db, user, actor):
    if user.id == actor.id or user.is_superuser or user.role == 'super_admin':
        return 'The platform owner account is protected from deletion.'
    account = db.get(CustomerAccount, user.customer_account_id)
    if account and account.owner_user_id == user.id:
        if db.query(User).filter(User.customer_account_id == account.id, User.id != user.id).first():
            return 'This user owns a workspace with team members. Suspend the user instead of deleting them.'
        for model in (Property, Tenant, Contract, Meter, MeterReading, RentPayment, PropertyExpense):
            if db.query(model).filter(model.customer_account_id == account.id).first():
                return 'This user owns saved records. Suspend access to preserve the data.'
    return None


@router.get('/users', response_model=list[AdminUserResponse])
def users(db=Depends(get_db), actor=Depends(get_current_superuser)):
    result = []
    for user in db.query(User).order_by(User.id).all():
        reason = deletion_blocker(db, user, actor)
        result.append(AdminUserResponse(**UserResponse.model_validate(user).model_dump(), can_delete=reason is None, deletion_reason=reason))
    return result

@router.post('/users', response_model=UserResponse, status_code=201)
def create(data: CreateUser, db=Depends(get_db), actor=Depends(get_current_superuser)):
    if len(data.password.encode()) > 72:
        raise HTTPException(400, 'Password exceeds the permitted length.')
    if db.query(User).filter(or_(User.email == data.email, User.username == data.username)).first():
        raise HTTPException(409, 'This username or email is already in use.')
    account = db.get(CustomerAccount, data.customer_account_id) if data.customer_account_id else None
    if data.customer_account_id and not account:
        raise HTTPException(404, 'Account not found.')
    if account and account.status != 'active':
        raise HTTPException(400, 'Account suspended.')
    user = User(**data.model_dump(exclude={'password', 'customer_account_id'}), hashed_password=AuthService(db).get_password_hash(data.password), is_superuser=False)
    db.add(user)
    db.flush()
    if not account:
        account = CustomerAccount(name=data.full_name or data.username, owner_user_id=user.id)
        db.add(account)
        db.flush()
    user.customer_account_id = account.id
    audit(db, actor, 'user.create', user)
    commit(db)
    return user

@router.get('/users/{user_id}')
def detail(user_id: int, db=Depends(get_db), actor=Depends(get_current_superuser)):
    user = target_user(db, user_id)
    account = db.get(CustomerAccount, user.customer_account_id)
    scope = user.customer_account_id
    return {**UserResponse.model_validate(user).model_dump(), 'property_count': db.query(Property).filter(Property.customer_account_id == scope).count(), 'unit_count': db.query(func.coalesce(func.sum(Property.total_units), 0)).filter(Property.customer_account_id == scope).scalar(), 'contract_count': db.query(Contract).filter(Contract.customer_account_id == scope).count(), 'subscription_tier': account.subscription_tier if account else None, 'subscription_expires_at': account.subscription_expires_at if account else None, 'can_delete': deletion_blocker(db, user, actor) is None, 'deletion_reason': deletion_blocker(db, user, actor)}

@router.put('/users/{user_id}', response_model=UserResponse)
def update(user_id: int, data: UpdateUser, db=Depends(get_db), actor=Depends(get_current_superuser)):
    user = target_user(db, user_id)
    mutable(user, actor)
    if user.email != data.email:
        user.email_verified_at = None
    if user.phone != data.phone:
        user.phone_verified_at = None
    for key, value in data.model_dump().items():
        setattr(user, key, value)
    user.token_version = (user.token_version or 0) + 1
    audit(db, actor, 'user.update', user)
    commit(db)
    return user

@router.post('/users/{user_id}/password', status_code=204)
def password(user_id: int, data: Password, db=Depends(get_db), actor=Depends(get_current_superuser)):
    user = target_user(db, user_id)
    mutable(user, actor)
    if len(data.password.encode()) > 72:
        raise HTTPException(400, 'Password exceeds the permitted length.')
    user.hashed_password = AuthService(db).get_password_hash(data.password)
    user.token_version = (user.token_version or 0) + 1
    user.locked_until = None
    user.failed_login_attempts = 0
    audit(db, actor, 'user.password_reset', user)
    commit(db)

@router.post('/users/{user_id}/reset-link')
def reset_link(user_id: int, db=Depends(get_db), actor=Depends(get_current_superuser)):
    from app.mailer import send_reset_link
    user = target_user(db, user_id)
    mutable(user, actor)
    service = AuthService(db)
    token = service.create_reset_token(user.email)
    service.save_reset_token(token, user.email)
    sent = send_reset_link(user.email, token)
    audit(db, actor, 'user.reset_link', user)
    commit(db)
    return {'sent': sent, 'message': 'Sent' if sent else 'Unable to send email. Check SMTP settings.'}

@router.delete('/users/{user_id}', status_code=204)
def delete(user_id: int, db=Depends(get_db), actor=Depends(get_current_superuser)):
    user = target_user(db, user_id)
    mutable(user, actor)
    reason = deletion_blocker(db, user, actor)
    if reason:
        raise HTTPException(409, reason)
    from app.models.user import PasswordReset, VerificationChallenge, RecoveryRequest
    account = db.get(CustomerAccount, user.customer_account_id)
    # Preserve past audit events while removing references to the deleted login.
    db.query(PasswordReset).filter(PasswordReset.user_id == user.id).delete()
    db.query(VerificationChallenge).filter(VerificationChallenge.user_id == user.id).delete()
    db.query(RecoveryRequest).filter(RecoveryRequest.user_id == user.id).update({"user_id": None, "used_at": datetime.utcnow()})
    db.query(AuditLog).filter(AuditLog.actor_user_id == user.id).update({'actor_user_id': None})
    event = AuditLog(actor_user_id=actor.id, customer_account_id=actor.customer_account_id,
                     action='user.delete', target_type='user', target_id=str(user.id),
                     details='Deleted login: ' + user.username)
    db.add(event)
    if account and account.owner_user_id == user.id:
        # Only empty, unshared workspaces reach this branch.
        user.customer_account_id = None
        account.owner_user_id = None
        db.flush()
        db.query(AuditLog).filter(AuditLog.customer_account_id == account.id).update({'customer_account_id': None})
        db.delete(account)
    db.delete(user)
    commit(db)

@router.get('/stats')
def stats(db=Depends(get_db)):
    return {'users': db.query(User).count(), 'active_users': db.query(User).filter(User.is_active.is_(True)).count(), 'accounts': db.query(CustomerAccount).count(), 'properties': db.query(Property).count(), 'contracts': db.query(Contract).count()}

@router.get('/audit')
def logs(db=Depends(get_db)):
    return [{'id': row.id, 'actor_user_id': row.actor_user_id, 'action': row.action, 'target_id': row.target_id, 'created_at': row.created_at} for row in db.query(AuditLog).order_by(AuditLog.id.desc()).limit(200)]

@router.get('/roles')
def roles(db=Depends(get_db)):
    return {role: (db.get(RolePolicy, role).permissions if db.get(RolePolicy, role) else DEFAULTS[role]) for role in ('admin', 'manager', 'accountant', 'employee')}

@router.put('/roles/{role}')
def policy(role: Role, data: Policy, db=Depends(get_db), actor=Depends(get_current_superuser)):
    if any(item not in ALL for item in data.permissions):
        raise HTTPException(400, 'Unknown permission.')
    row = db.get(RolePolicy, role)
    if row:
        row.permissions = data.permissions
    else:
        db.add(RolePolicy(role=role, permissions=data.permissions))
    db.add(AuditLog(actor_user_id=actor.id, action='role.update', target_type='role', target_id=role))
    commit(db)
    return {'permissions': data.permissions}

class AnnualSubscription(BaseModel):
    subscription_tier: str = Field(min_length=1, max_length=30)
    expires_at: datetime

@router.get('/integrations')
def integrations():
    from app import mailer, phone_provider
    from app.services.recovery_service import options
    return {'recovery': options(), 'email_configured': mailer.configured(), 'phone_configured': phone_provider.configured(), 'billing_cycle':'annual', 'payment_configured':False}

@router.put('/users/{user_id}/subscription')
def subscription(user_id:int, data:AnnualSubscription, db=Depends(get_db), actor=Depends(get_current_superuser)):
    user=target_user(db,user_id)
    account=db.get(CustomerAccount,user.customer_account_id)
    if not account:
        raise HTTPException(404,'Workspace not found.')
    from datetime import timezone
    expires=data.expires_at
    if expires.tzinfo:
        expires=expires.astimezone(timezone.utc).replace(tzinfo=None)
    if expires<=datetime.utcnow():
        raise HTTPException(400,'Subscription expiry must be in the future.')
    account.subscription_tier=data.subscription_tier
    account.subscription_expires_at=expires
    audit(db,actor,'subscription.manual_update',user)
    commit(db)
    return {'subscription_tier':account.subscription_tier,'subscription_expires_at':account.subscription_expires_at,'billing_cycle':'annual'}
