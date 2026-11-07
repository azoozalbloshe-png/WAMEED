"""Account-scoped lifecycle operations. Linked business history is never cascaded away."""
from datetime import datetime, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Response
from app.database import get_db
from app.routers.auth import get_current_active_user
from app.models.real_estate import Property, Tenant, Contract, Meter, PropertyExpense
from app.models.operations import Unit, MaintenanceRequest, Attachment
from app.models.user import AuditLog
from app.permissions import ensure

router = APIRouter(prefix='/api/real-estate')
Resource = Literal['properties', 'units']

def dependencies(db, row, resource):
    checks = [(Contract, 'Contracts'), (PropertyExpense, 'Expenses'), (MaintenanceRequest, 'Maintenance')]
    if resource == 'properties': checks = [(Unit, 'Units'), (Tenant, 'Tenants'), (Meter, 'Meters')] + checks
    field = 'property_id' if resource == 'properties' else 'unit_id'
    links = []
    for model, kind in checks:
        count = db.query(model).filter(getattr(model, field) == row.id).count()
        if count: links.append({'kind': kind, 'count': count})
    if resource == 'properties':
        count = db.query(Attachment).filter(Attachment.resource == resource, Attachment.record_id == row.id).count()
        if count: links.append({'kind': 'Attachments', 'count': count})
    return links

def owned(db, user, resource, id):
    ensure(db, user, 'properties', 'delete')
    model = Property if resource == 'properties' else Unit
    row = db.query(model).filter(model.id == id, model.customer_account_id == (user.customer_account_id or -1)).with_for_update().first()
    if not row: raise HTTPException(404, 'Record not found or access is unavailable.')
    return row

@router.get('/{resource}/{id}/lifecycle')
def lifecycle(resource: Resource, id: int, db=Depends(get_db), user=Depends(get_current_active_user)):
    row = owned(db, user, resource, id)
    links = dependencies(db, row, resource)
    parent = db.query(Property).filter(Property.id == row.property_id, Property.customer_account_id == user.customer_account_id).first() if resource == 'units' else None
    return {'archived': bool(row.archived_at), 'can_delete': not links, 'parent_archived': bool(parent and parent.archived_at), 'links': links}

@router.delete('/{resource}/{id}', status_code=204)
def delete_record(resource: Resource, id: int, db=Depends(get_db), user=Depends(get_current_active_user)):
    row = owned(db, user, resource, id)
    if dependencies(db, row, resource):
        raise HTTPException(409, 'Linked records prevent permanent deletion. Archive this record instead.')
    if resource == 'units':
        p = db.query(Property).filter(Property.id == row.property_id, Property.customer_account_id == user.customer_account_id).first()
        if p:
            remaining = db.query(Unit).filter(Unit.property_id == p.id, Unit.id != id).count()
            p.total_units = max(remaining, (p.total_units or 0) - 1)
    db.add(AuditLog(actor_user_id=user.id, customer_account_id=user.customer_account_id, action=resource+'.delete', target_type=resource, target_id=str(id)))
    db.delete(row)
    db.commit()
    return Response(status_code=204)

@router.post('/{resource}/{id}/{action}')
def archive_or_restore(resource: Resource, id: int, action: Literal['archive', 'restore'], db=Depends(get_db), user=Depends(get_current_active_user)):
    row = owned(db, user, resource, id)
    if action == 'restore' and resource == 'units':
        parent = db.query(Property).filter(Property.id == row.property_id, Property.customer_account_id == user.customer_account_id).first()
        if not parent or parent.archived_at: raise HTTPException(409, 'Restore the property before restoring this unit.')
    row.archived_at = (row.archived_at or datetime.now(timezone.utc)) if action == 'archive' else None
    db.add(AuditLog(actor_user_id=user.id, customer_account_id=user.customer_account_id, action=resource+'.'+action, target_type=resource, target_id=str(id)))
    db.commit()
    return {'id': id, 'archived_at': row.archived_at}
