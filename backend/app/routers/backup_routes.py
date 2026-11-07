from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from app.database import get_db
from app.routers.auth import get_current_active_user, get_current_superuser
from app.models.user import CustomerAccount, AuditLog
from app.config import settings
from app.services import backups

router=APIRouter()
PRIVATE={'Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff'}

@router.get('/api/account/data-export/status')
def export_status(db=Depends(get_db),user=Depends(get_current_active_user)):
    account=db.get(CustomerAccount,user.customer_account_id) if user.customer_account_id else None
    return {'allowed':bool(account and account.owner_user_id==user.id)}

@router.get('/api/account/data-export')
def export_data(db=Depends(get_db),user=Depends(get_current_active_user)):
    account=db.get(CustomerAccount,user.customer_account_id) if user.customer_account_id else None
    if not account or account.owner_user_id!=user.id:raise HTTPException(403,'Only the customer account owner can export account data.')
    actor_id=user.id;account_id=account.id
    content=backups.export_account(db,account)
    db.rollback()
    db.add(AuditLog(actor_user_id=actor_id,customer_account_id=account_id,action='data.export',target_type='customer_account',target_id=str(account_id)));db.commit()
    return Response(content,media_type='application/zip',headers={**PRIVATE,'Content-Disposition':f'attachment; filename="wameed-account-{account_id}-{backups.now():%Y%m%d}.zip"'})

@router.get('/api/admin/backups')
def backup_status(request:Request,db=Depends(get_db),actor=Depends(get_current_superuser)):
    worker=getattr(request.app.state,'backup_worker',None)
    return {'enabled':settings.BACKUP_ENABLED,'interval_hours':settings.BACKUP_INTERVAL_HOURS,'retention_count':settings.BACKUP_RETENTION_COUNT,'supported':db.get_bind().dialect.name=='sqlite','error':getattr(worker,'error',None),'snapshots':backups.list_snapshots(),'accounts':[{'id':r.id,'name':r.name} for r in db.execute(select(CustomerAccount).order_by(CustomerAccount.id)).scalars()]}

@router.post('/api/admin/backups',status_code=201)
def take_backup(db=Depends(get_db),actor=Depends(get_current_superuser)):
    actor_id=actor.id;account_id=actor.customer_account_id;engine=db.get_bind();db.rollback()
    try:meta=backups.create_snapshot(engine,'manual')
    except OSError:raise HTTPException(503,'The backup could not be saved. Check server storage.')
    db.add(AuditLog(actor_user_id=actor_id,customer_account_id=account_id,action='backup.create',target_type='backup',target_id=meta['id']));db.commit()
    return meta

class Preview(BaseModel):
    account_id:int=Field(gt=0)

class Restore(Preview):
    token:str=Field(min_length=20,max_length=3000)
    confirmation:str=Field(min_length=1,max_length=150)

@router.post('/api/admin/backups/{id}/preview')
def preview(id:str,data:Preview,db=Depends(get_db),actor=Depends(get_current_superuser)):
    return backups.preview_restore(db,id,data.account_id,actor)

@router.post('/api/admin/backups/{id}/restore')
def restore(id:str,data:Restore,db=Depends(get_db),actor=Depends(get_current_superuser)):
    try:return backups.restore_account(db,id,data.account_id,actor,data.token,data.confirmation)
    except OSError:raise HTTPException(503,'The safety backup could not be saved. Recovery was cancelled.')
