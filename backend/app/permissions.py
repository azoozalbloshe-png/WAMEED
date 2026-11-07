from fastapi import Depends, HTTPException, Request
from app.database import get_db
from app.models.user import RolePolicy, CustomerAccount
from datetime import datetime
from app.routers.auth import get_current_active_user

RESOURCES = ('properties', 'tenants', 'contracts', 'payments', 'expenses', 'meters', 'dashboard')
ALL = [f'{resource}:{action}' for resource in RESOURCES for action in ('read', 'write', 'create', 'update', 'delete')]
DEFAULTS = {
    'admin': [f'{r}:{a}' for r in RESOURCES for a in ('read','write')], 'manager': [f'{r}:{a}' for r in RESOURCES for a in ('read','write')],
    'accountant': [f'{r}:read' for r in RESOURCES] + ['payments:write', 'expenses:write'],
    'employee': [f'{r}:read' for r in RESOURCES],
    'user': [f'{r}:read' for r in RESOURCES],
    'superadmin': [f'{r}:read' for r in RESOURCES],
}

async def require_business_permission(request: Request, user=Depends(get_current_active_user), db=Depends(get_db)):
    if user.role == 'super_admin' and user.is_superuser:
        return
    account = db.get(CustomerAccount, user.customer_account_id)
    if request.method not in ('GET', 'HEAD') and account and account.subscription_expires_at and account.subscription_expires_at <= datetime.utcnow():
        raise HTTPException(402, 'Your subscription expired. You can still view your records. Contact administration to renew.')
    resource = request.url.path.removeprefix('/api/real-estate/').split('/')[0]
    action = 'read' if request.method in ('GET', 'HEAD') else 'create' if request.method == 'POST' else 'delete' if request.method == 'DELETE' else 'update'
    policy = db.get(RolePolicy, user.role)
    allowed = policy.permissions if policy else DEFAULTS.get(user.role, [])
    if f'{resource}:{action}' not in allowed and not (action in ('create','update','delete') and f'{resource}:write' in allowed):
        raise HTTPException(403, 'You do not have permission to perform this action.')


def allowed(db, user, resource, action='read'):
    if user.role == 'super_admin' and user.is_superuser:
        return True
    policy = db.get(RolePolicy, user.role)
    permissions = policy.permissions if policy else DEFAULTS.get(user.role, [])
    return f'{resource}:{action}' in permissions or (action in ('create', 'update', 'delete') and f'{resource}:write' in permissions)


def ensure(db, user, resource, action='read'):
    if not allowed(db,user,resource,action):
        raise HTTPException(403, 'You do not have permission to perform this action.')
    account = db.get(CustomerAccount,user.customer_account_id)
    if action != 'read' and account and account.subscription_expires_at and account.subscription_expires_at <= datetime.utcnow():
        raise HTTPException(402,'Your subscription expired. Contact administration to renew.')
