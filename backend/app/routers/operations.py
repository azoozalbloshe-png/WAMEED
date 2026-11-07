from datetime import date, datetime, timedelta
from typing import Literal, Optional
from urllib.parse import quote
from pathlib import PurePath
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import func, or_, String
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.routers.auth import get_current_active_user
from app.models.user import User, AuditLog
from app.models.real_estate import Property, Tenant, Contract, Meter, MeterReading, RentPayment, PropertyExpense, ContractStatus
from app.models.operations import Unit, MaintenanceRequest, Attachment
from app.permissions import ensure, allowed
from app.services.financials import scope, today, local_day, month_add, period, portfolio, totals, outstanding, contract_live, rounded
from app.services.exports import xlsx
from app.locales import label

router=APIRouter(prefix='/api/real-estate')
UserDep=Depends(get_current_active_user)
DB=Depends(get_db)
Preset=Literal['6','12','year','custom']

def get(db,model,id,user):
    row=scope(db,model,user,include_archived=model in (Property,Unit)).filter(model.id==id).first()
    if not row: raise HTTPException(404,'Record not found or access is unavailable.')
    return row

def audit(db,user,action,kind,id):
    db.add(AuditLog(actor_user_id=user.id,customer_account_id=user.customer_account_id,action=action,target_type=kind,target_id=str(id)))

def commit(db):
    try: db.commit()
    except IntegrityError:
        db.rollback();raise HTTPException(409,'Duplicate record or invalid linked data.')

def finance_access(db,user):
    for resource in ('contracts','payments','expenses'):ensure(db,user,resource)

def unit_view(db,u,user):
    contracts=scope(db,Contract,user).filter(Contract.unit_id==u.id).all()
    active=next((c for c in contracts if contract_live(c)),None)
    return {'archived_at':u.archived_at,'id':u.id,'property_id':u.property_id,'number':u.number,'floor':u.floor,'description':u.description,'status':'occupied' if active else u.status,'tenant_id':active.tenant_id if active and allowed(db,user,'tenants') else None,'tenant':active.tenant.name if active and active.tenant and allowed(db,user,'tenants') else None,'contract_id':active.id if active and allowed(db,user,'contracts') else None}

def contract_view(c):
    return {'id':c.id,'property_id':c.property_id,'property_name':c.property.name if c.property else '', 'tenant_id':c.tenant_id,'tenant_name':c.tenant.name if c.tenant else '', 'unit_id':c.unit_id,'start_date':c.start_date,'end_date':c.end_date,'status':'expired' if c.status==ContractStatus.ACTIVE and local_day(c.end_date)<today() else 'upcoming' if c.status==ContractStatus.ACTIVE and local_day(c.start_date)>today() else c.status.value,'monthly_rent':c.monthly_rent,'deposit_amount':c.deposit_amount,'notes':c.notes}

def files(db,user,resource,id):
    return [{'id':a.id,'filename':a.filename,'content_type':a.content_type} for a in scope(db,Attachment,user).filter(Attachment.resource==resource,Attachment.record_id==id).all()]

@router.get('/permissions')
def effective_permissions(db=DB,user=UserDep):
    return {r:{a:allowed(db,user,r,a) for a in ('read','create','update','delete')} for r in ('properties','tenants','contracts','payments','expenses','meters','dashboard')}

@router.get('/dashboard/analytics')
def analytics(preset:Preset='6',start:Optional[date]=None,end:Optional[date]=None,property_id:Optional[int]=None,db=DB,user=UserDep):
    finance_access(db,user);ensure(db,user,'dashboard')
    if property_id:get(db,Property,property_id,user)
    first,last=period(preset,start,end)
    cs,ps,es=portfolio(db,user,property_id)
    rows=[];cursor=first.replace(day=1)
    while cursor<=last:
        next_month=month_add(cursor,1)
        rows.append({'month':cursor.strftime('%Y-%m'),**totals(cs,ps,es,max(cursor,first),min(last,next_month-timedelta(days=1)))})
        cursor=next_month
    span=(last-first).days+1
    previous_end=first-timedelta(days=1);previous_start=previous_end-timedelta(days=span-1)
    return {'start':first,'end':last,'months':rows,'totals':totals(cs,ps,es,first,last),'previous':totals(cs,ps,es,previous_start,previous_end),'previous_start':previous_start,'previous_end':previous_end,'basis':'Revenue is contractual accrual prorated over calendar days. Net income equals contractual revenue minus expenses. Cash collections use the payment date. Comparison uses the preceding period with the same number of days.'}

@router.get('/alerts')
@router.get('/dashboard/alerts')
def alerts(db=DB,user=UserDep):
    ensure(db,user,'dashboard');now=today();items=[];counts={}
    def add(kind,title,text,href,due=None,amount=None,property_id=None,property_name=None,record_id=None):
        counts[kind]=counts.get(kind,0)+1
        items.append({'type':kind,'title':title,'description':text,'href':href,'date':due,'amount':amount,'id':f'{kind}:{record_id or href}:{due or ""}','property_id':property_id,'property_name':property_name,'days_until':(due-now).days if due else None,'is_overdue':bool(due and due<now)})
    if allowed(db,user,'contracts'):
        cs=scope(db,Contract,user).all()
        ps=scope(db,RentPayment,user).all() if allowed(db,user,'payments') else None
        by_id={c.id:c for c in cs};renewed=set()
        for fresh in cs:
            marker=(fresh.notes or '').removeprefix('Renewal of contract #')
            if (fresh.notes or '').startswith('Renewal of contract #') and marker.isdecimal() and fresh.status in (ContractStatus.ACTIVE,ContractStatus.EXPIRED):
                parent=by_id.get(int(marker))
                if parent and parent.property_id==fresh.property_id and parent.tenant_id==fresh.tenant_id and local_day(fresh.start_date)>local_day(parent.end_date):renewed.add(parent.id)

        for c in cs:
            name=f"{(c.tenant.name if c.tenant else '')} · {(c.property.name if c.property else '')} · Contract #{c.id}"
            end=local_day(c.end_date)
            if c.id not in renewed and c.status==ContractStatus.ACTIVE and now<=end<=now+timedelta(days=30):add('expiring','Contract expiring soon',name,f'/contracts/{c.id}',end,property_id=c.property_id,property_name=c.property.name if c.property else '',record_id=c.id)
            if c.id not in renewed and c.status in (ContractStatus.ACTIVE,ContractStatus.EXPIRED) and end<now:add('renewal','Contract renewal needs review',name,f'/contracts/{c.id}',end,property_id=c.property_id,property_name=c.property.name if c.property else '',record_id=c.id)
            if ps is not None:
                for due in outstanding(c,ps):
                    when=date.fromisoformat(due['due_date'])
                    if when<now:add('overdue','Overdue contractual rent',name,due['href'],when,due['outstanding'],property_id=c.property_id,property_name=c.property.name if c.property else '',record_id=c.id)
                    elif when<=now+timedelta(days=7):add('due','Payment due within 7 days',name,due['href'],when,due['outstanding'],property_id=c.property_id,property_name=c.property.name if c.property else '',record_id=c.id)
    if allowed(db,user,'properties'):
        for u in scope(db,Unit,user).all():
            if unit_view(db,u,user)['status']=='available':add('vacant',f'Unit {u.number} is vacant','A registered detailed unit with no linked active contract',f'/units/{u.id}')
    if allowed(db,user,'meters'):
        for m in scope(db,Meter,user).all():
            last=scope(db,MeterReading,user).filter(MeterReading.meter_id==m.id).order_by(MeterReading.reading_date.desc()).first()
            if not last or local_day(last.reading_date)<now-timedelta(days=30):add('meter','Meter reading needs attention',f'Meter {m.meter_number} · No reading in the last 30 days',f'/calculation?meter={m.id}')
            if last and last.total_cost>0:add('bill','Recorded meter bill for review',f'Meter {m.meter_number} · Latest recorded bill; payment status is not tracked',f'/calculation?meter={m.id}',local_day(last.reading_date),last.total_cost)
    if allowed(db,user,'expenses'):
        for m in scope(db,MaintenanceRequest,user).filter(MaintenanceRequest.status!='completed').all():
            if m.due_date and local_day(m.due_date)<=now+timedelta(days=7):add('maintenance','Maintenance request needs attention',m.title,f'/maintenance?record={m.id}',local_day(m.due_date),property_id=m.property_id,property_name=get(db,Property,m.property_id,user).name,record_id=m.id)
    order={'overdue':0,'renewal':1,'expiring':2,'due':3,'maintenance':4,'meter':5,'bill':6,'vacant':7}
    items.sort(key=lambda a:(order.get(a['type'],9),str(a['date'] or '')))
    return {'items':items,'counts':counts,'as_of':now,'basis':'Installments run monthly from the contract start, allocating recorded payments oldest first and prorating the final period. Legacy contracts without linked units do not imply vacant units.'}

@router.get('/search')
def search(q:str=Query(min_length=1,max_length=100),db=DB,user=UserDep):
    query=q.strip().translate(str.maketrans('٠١٢٣٤٥٦٧٨٩','0123456789'));pattern='%'+query.replace('\\','\\\\').replace('%','\\%').replace('_','\\_')+'%';items=[]
    def like(column):return column.ilike(pattern,escape='\\')
    def add(type,id,title,subtitle,href):items.append({'type':type,'id':id,'title':title,'subtitle':subtitle or '', 'href':href})
    if allowed(db,user,'properties'):
        for p in scope(db,Property,user).filter(or_(like(Property.name),like(Property.address),like(Property.city))).limit(10):add('Property',p.id,p.name,p.address,f'/properties/{p.id}')
        for u in scope(db,Unit,user).filter(or_(like(Unit.number),like(Unit.description))).limit(10):add('Unit',u.id,f'Unit {u.number}',get(db,Property,u.property_id,user).name,f'/units/{u.id}')
    if allowed(db,user,'tenants'):
        for t in scope(db,Tenant,user).filter(or_(like(Tenant.name),like(Tenant.phone),like(Tenant.email),like(Tenant.national_id))).limit(10):add('Tenant',t.id,t.name,t.phone,f'/tenants/{t.id}')
    if allowed(db,user,'contracts'):
        for c in scope(db,Contract,user).filter(or_(like(func.cast(Contract.id, String)),like(Contract.notes))).limit(10):add('Contract',c.id,f'Contract #{c.id}',c.tenant.name if c.tenant else '',f'/contracts/{c.id}')
    if allowed(db,user,'meters'):
        for m in scope(db,Meter,user).filter(like(Meter.meter_number)).limit(10):add('Meter',m.id,m.meter_number,'Registered meter',f'/calculation?meter={m.id}')
    if allowed(db,user,'expenses'):
        for e in scope(db,PropertyExpense,user).filter(or_(like(PropertyExpense.category),like(PropertyExpense.invoice_reference),like(PropertyExpense.description))).limit(10):add('Expense',e.id,e.category,e.invoice_reference,f'/payments?expense={e.id}')
        for m in scope(db,MaintenanceRequest,user).filter(or_(like(MaintenanceRequest.title),like(MaintenanceRequest.description))).limit(10):add('Maintenance',m.id,m.title,m.status,f'/maintenance?record={m.id}')
    return {'items':items}

class UnitData(BaseModel):
    model_config=ConfigDict(str_strip_whitespace=True)
    number:str=Field(min_length=1,max_length=50)
    floor:Optional[str]=Field(None,max_length=50)
    description:Optional[str]=Field(None,max_length=3000)
    status:Literal['available','maintenance']='available'

@router.post('/properties/{id}/units',status_code=201)
def create_unit(id:int,data:UnitData,db=DB,user=UserDep):
    ensure(db,user,'properties','create');p=get(db,Property,id,user)
    if p.archived_at:raise HTTPException(409,'Restore the property before adding new records.')
    if scope(db,Unit,user,include_archived=True).filter(Unit.property_id==p.id,Unit.number==data.number).first():raise HTTPException(409,'This unit number is already registered for this property.')
    u=Unit(**data.model_dump(),property_id=p.id,customer_account_id=user.customer_account_id);db.add(u);db.flush()
    count=scope(db,Unit,user).filter(Unit.property_id==p.id).count();p.total_units=max(p.total_units or 0,count)
    audit(db,user,'unit.create','unit',u.id);commit(db);return unit_view(db,u,user)

@router.get('/units/{id}')
def unit_detail(id:int,db=DB,user=UserDep):
    ensure(db,user,'properties');u=get(db,Unit,id,user);p=get(db,Property,u.property_id,user)
    result={**unit_view(db,u,user),'property_name':p.name,'contracts':[],'expenses':[],'maintenance':[]}
    if allowed(db,user,'contracts'):result['contracts']=[contract_view(c) for c in scope(db,Contract,user).filter(Contract.unit_id==u.id)]
    if allowed(db,user,'expenses'):
        result['expenses']=[{'id':e.id,'category':e.category,'amount':e.amount,'spent_at':e.spent_at} for e in scope(db,PropertyExpense,user).filter(PropertyExpense.unit_id==u.id)]
        result['maintenance']=[maintenance_view(db,m,user) for m in scope(db,MaintenanceRequest,user).filter(MaintenanceRequest.unit_id==u.id)]
    return result

@router.put('/units/{id}')
def update_unit(id:int,data:UnitData,db=DB,user=UserDep):
    ensure(db,user,'properties','update');u=get(db,Unit,id,user)
    if scope(db,Unit,user,include_archived=True).filter(Unit.property_id==u.property_id,Unit.number==data.number,Unit.id!=id).first():raise HTTPException(409,'This unit number is already registered for this property.')
    if data.status=='maintenance' and any(contract_live(c) for c in scope(db,Contract,user).filter(Contract.unit_id==u.id)):raise HTTPException(409,'The unit has an active rental contract and cannot be marked under maintenance.')
    for k,v in data.model_dump().items():setattr(u,k,v)
    audit(db,user,'unit.update','unit',u.id);commit(db);return unit_view(db,u,user)

@router.get('/properties/{id}/overview')
def property_overview(id:int,db=DB,user=UserDep):
    ensure(db,user,'properties');p=get(db,Property,id,user)
    units=[unit_view(db,u,user) for u in scope(db,Unit,user,include_archived=True).filter(Unit.property_id==id)]
    result={'archived_at':p.archived_at,'id':p.id,'name':p.name,'address':p.address,'city':p.city,'description':p.description,'property_type':p.property_type.value,'total_units':p.total_units,'legacy_occupied_units':p.occupied_units,'units':units,'photos':files(db,user,'properties',id),'tenants':[],'contracts':[],'meters':[],'finance':None,'unassigned_active_contracts':0}
    if allowed(db,user,'tenants'):result['tenants']=[{'id':t.id,'name':t.name,'phone':t.phone} for t in scope(db,Tenant,user).filter(Tenant.property_id==id)]
    if allowed(db,user,'contracts'):
        cs=scope(db,Contract,user).filter(Contract.property_id==id).all();result['contracts']=[contract_view(c) for c in cs];result['unassigned_active_contracts']=sum(contract_live(c) and c.unit_id is None for c in cs)
    if allowed(db,user,'meters'):result['meters']=[{'id':m.id,'meter_number':m.meter_number,'meter_type':m.meter_type.value,'current_reading':m.current_reading} for m in scope(db,Meter,user).filter(Meter.property_id==id)]
    if all(allowed(db,user,r) for r in ('contracts','payments','expenses')):
        cs,ps,es=portfolio(db,user,id);now=today();result['finance']={'month':totals(cs,ps,es,now.replace(day=1),now),'year':totals(cs,ps,es,date(now.year,1,1),now)}
    return result

@router.get('/tenants/{id}/overview')
def tenant_overview(id:int,db=DB,user=UserDep):
    ensure(db,user,'tenants');t=get(db,Tenant,id,user)
    return {'id':t.id,'name':t.name,'phone':t.phone,'email':t.email,'property_id':t.property_id,'contracts':[contract_view(c) for c in scope(db,Contract,user).filter(Contract.tenant_id==id)] if allowed(db,user,'contracts') else []}

@router.get('/contracts/{id}/overview')
def contract_overview(id:int,db=DB,user=UserDep):
    ensure(db,user,'contracts');c=get(db,Contract,id,user);result={**contract_view(c),'dues':[],'payments':[]}
    if allowed(db,user,'payments'):
        ps=scope(db,RentPayment,user).filter(RentPayment.contract_id==id).all();result['dues']=outstanding(c,ps);result['payments']=[{'id':p.id,'amount':p.amount,'paid_at':p.paid_at,'method':p.method} for p in ps]
    return result

class ContractUnit(BaseModel):
    unit_id:Optional[int]=Field(None,gt=0)

@router.put('/contracts/{id}/unit')
def assign_unit(id:int,data:ContractUnit,db=DB,user=UserDep):
    ensure(db,user,'contracts','update');c=get(db,Contract,id,user)
    if data.unit_id:
        u=get(db,Unit,data.unit_id,user)
        if u.property_id!=c.property_id:raise HTTPException(422,'This unit does not belong to the selected property.')
        if u.archived_at or get(db,Property,u.property_id,user).archived_at:raise HTTPException(409,'Restore the property and unit before adding new records.')
        if u.status=='maintenance':raise HTTPException(409,'This unit is under maintenance.')
        conflicts=scope(db,Contract,user).filter(Contract.unit_id==u.id,Contract.id!=id,Contract.status==ContractStatus.ACTIVE,Contract.start_date<=c.end_date,Contract.end_date>=c.start_date).first()
        if conflicts:raise HTTPException(409,'This unit has an overlapping contract.')
    c.unit_id=data.unit_id;audit(db,user,'contract.unit','contract',id);commit(db);return contract_view(c)

class Renewal(BaseModel):
    model_config=ConfigDict(allow_inf_nan=False)
    start_date:date
    end_date:date
    monthly_rent:float=Field(gt=0)

@router.post('/contracts/{id}/renew',status_code=201)
def renew(id:int,data:Renewal,db=DB,user=UserDep):
    ensure(db,user,'contracts','create');c=get(db,Contract,id,user)
    if get(db,Property,c.property_id,user).archived_at:raise HTTPException(409,'Restore the property before adding new records.')
    if data.start_date<=local_day(c.end_date) or data.end_date<=data.start_date:raise HTTPException(422,'Start the renewal after the current contract ends, and choose a later end date.')
    duplicate=scope(db,Contract,user).filter(Contract.tenant_id==c.tenant_id,Contract.property_id==c.property_id,Contract.status==ContractStatus.ACTIVE,func.date(Contract.start_date)<=data.end_date,func.date(Contract.end_date)>=data.start_date).first()
    if duplicate:raise HTTPException(409,'This tenant and property have an overlapping contract period.')
    fresh=Contract(customer_account_id=user.customer_account_id,property_id=c.property_id,tenant_id=c.tenant_id,unit_id=c.unit_id,start_date=datetime.combine(data.start_date,datetime.min.time()),end_date=datetime.combine(data.end_date,datetime.min.time()),monthly_rent=data.monthly_rent,deposit_amount=c.deposit_amount,notes=f'Renewal of contract #{c.id}')
    if c.unit_id:
        u=get(db,Unit,c.unit_id,user)
        if u.archived_at or get(db,Property,u.property_id,user).archived_at:raise HTTPException(409,'Restore the property and unit before adding new records.')
        if u.status=='maintenance':raise HTTPException(409,'This unit is under maintenance.')
        conflict=scope(db,Contract,user).filter(Contract.unit_id==c.unit_id,Contract.status==ContractStatus.ACTIVE,Contract.start_date<=fresh.end_date,Contract.end_date>=fresh.start_date).first()
        if conflict:raise HTTPException(409,'This unit has an overlapping contract period.')
    db.add(fresh);db.flush();audit(db,user,'contract.renew','contract',fresh.id);commit(db);return contract_view(fresh)

class MaintenanceData(BaseModel):
    model_config=ConfigDict(str_strip_whitespace=True)
    property_id:int=Field(gt=0)
    unit_id:Optional[int]=Field(None,gt=0)
    title:str=Field(min_length=2,max_length=150)
    description:Optional[str]=Field(None,max_length=5000)
    priority:Literal['low','normal','urgent']='normal'
    status:Literal['open','in_progress','completed']='open'
    due_date:Optional[datetime]=None

def maintenance_view(db,m,user):
    return {'id':m.id,'property_id':m.property_id,'property_name':get(db,Property,m.property_id,user).name,'unit_id':m.unit_id,'title':m.title,'description':m.description,'priority':m.priority,'status':m.status,'due_date':m.due_date,'created_at':m.created_at,'attachments':files(db,user,'maintenance',m.id)}

def validate_links(db,user,property_id,unit_id):
    if get(db,Property,property_id,user).archived_at:raise HTTPException(409,'Restore the property before adding new records.')
    if unit_id and get(db,Unit,unit_id,user).archived_at:raise HTTPException(409,'Restore the property and unit before adding new records.')
    if unit_id and get(db,Unit,unit_id,user).property_id!=property_id:raise HTTPException(422,'This unit does not belong to the selected property.')

@router.get('/maintenance')
def maintenance(db=DB,user=UserDep):
    ensure(db,user,'expenses');return [maintenance_view(db,m,user) for m in scope(db,MaintenanceRequest,user).order_by(MaintenanceRequest.created_at.desc())]

@router.post('/maintenance',status_code=201)
def create_maintenance(data:MaintenanceData,db=DB,user=UserDep):
    ensure(db,user,'expenses','create');validate_links(db,user,data.property_id,data.unit_id)
    m=MaintenanceRequest(**data.model_dump(),customer_account_id=user.customer_account_id);db.add(m);db.flush();audit(db,user,'maintenance.create','maintenance',m.id);commit(db);return maintenance_view(db,m,user)

@router.put('/maintenance/{id}')
def update_maintenance(id:int,data:MaintenanceData,db=DB,user=UserDep):
    ensure(db,user,'expenses','update');m=get(db,MaintenanceRequest,id,user);validate_links(db,user,data.property_id,data.unit_id)
    for k,v in data.model_dump().items():setattr(m,k,v)
    audit(db,user,'maintenance.update','maintenance',id);commit(db);return maintenance_view(db,m,user)

@router.delete('/maintenance/{id}',status_code=204)
def archive_maintenance(id:int,db=DB,user=UserDep):
    ensure(db,user,'expenses','delete');m=get(db,MaintenanceRequest,id,user);m.archived_at=datetime.utcnow();audit(db,user,'maintenance.archive','maintenance',id);commit(db)

@router.post('/maintenance/{id}/restore')
def restore_maintenance(id:int,db=DB,user=UserDep):
    ensure(db,user,'expenses','delete');m=db.query(MaintenanceRequest).filter(MaintenanceRequest.id==id,MaintenanceRequest.customer_account_id==(user.customer_account_id or -1)).first()
    if not m:raise HTTPException(404,'Record not found')
    m.archived_at=None;audit(db,user,'maintenance.restore','maintenance',id);commit(db);return maintenance_view(db,m,user)

FILE_RESOURCES={'properties':Property,'expenses':PropertyExpense,'maintenance':MaintenanceRequest}
@router.post('/files/{resource}/{id}',status_code=201)
async def upload_file(resource:Literal['properties','expenses','maintenance'],id:int,file:UploadFile=File(...),db=DB,user=UserDep):
    permission='properties' if resource=='properties' else 'expenses';ensure(db,user,permission,'update');get(db,FILE_RESOURCES[resource],id,user)
    content=await file.read(5*1024*1024+1)
    if len(content)>5*1024*1024:raise HTTPException(413,'File size must not exceed 5 MB.')
    mime='image/png' if content.startswith(b'\x89PNG\r\n\x1a\n') else 'image/jpeg' if content.startswith(b'\xff\xd8\xff') else 'image/webp' if content[:4]==b'RIFF' and content[8:12]==b'WEBP' else 'application/pdf' if content.startswith(b'%PDF-') else None
    if not mime or (resource=='properties' and not mime.startswith('image/')):raise HTTPException(422,'Accepted files: PNG, JPEG and WebP images; PDF invoices for expenses and maintenance.')
    total=db.query(func.coalesce(func.sum(func.length(Attachment.content)),0)).filter(Attachment.customer_account_id==user.customer_account_id).scalar()
    if total+len(content)>100*1024*1024:raise HTTPException(413,'Account attachment limit reached: 100 MB.')
    filename=PurePath((file.filename or 'attachment').replace('\\','/')).name[:180]
    a=Attachment(customer_account_id=user.customer_account_id,resource=resource,record_id=id,filename=filename,content_type=mime,content=content);db.add(a);db.flush();audit(db,user,'file.create',resource,id);commit(db);return {'id':a.id,'filename':filename,'content_type':mime}

@router.get('/files/{id}')
def download_file(id:int,db=DB,user=UserDep):
    a=get(db,Attachment,id,user);ensure(db,user,'properties' if a.resource=='properties' else 'expenses');get(db,FILE_RESOURCES[a.resource],a.record_id,user)
    return Response(a.content,media_type=a.content_type,headers={'Content-Disposition':f"attachment; filename*=UTF-8''{quote(a.filename)}",'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'})

@router.get('/files/{resource}/{id}/list')
def list_files(resource:Literal['properties','expenses','maintenance'],id:int,db=DB,user=UserDep):
    ensure(db,user,'properties' if resource=='properties' else 'expenses');get(db,FILE_RESOURCES[resource],id,user);return files(db,user,resource,id)

ReportKind=Literal['revenue','expenses','collections','overdue','contracts','properties','performance','monthly','annual']

@router.get('/reports/data')
def report(kind:ReportKind='monthly',preset:Preset='6',start:Optional[date]=None,end:Optional[date]=None,property_id:Optional[int]=None,status:Optional[str]=None,category:Optional[str]=None,db=DB,user=UserDep):
    required={'expenses':['expenses'],'collections':['payments','contracts'],'overdue':['contracts','payments'],'contracts':['contracts'],'properties':['properties']}.get(kind,['contracts','payments','expenses','properties'])
    for resource in required:ensure(db,user,resource)
    if property_id:get(db,Property,property_id,user)
    first,last=period(preset,start,end)
    cs,ps,es=portfolio(db,user,property_id)
    labels={'date':'Date','property':'Property','tenant':'Tenant','contract':'Contract','category':'Category','status':'Status','amount':'Amount','revenue':'Contractual revenue','collections':'Collections','expenses':'Expenses','net_income':'Net income','cash_net':'Net cash','outstanding':'Outstanding','start':'Start','end':'End','units':'Units','registered_units':'Detailed units','occupied':'Occupied detailed units','period':'Period','reference':'Reference'}
    rows=[]
    if kind in ('monthly','annual','revenue'):
        columns=['period','revenue','collections','expenses','net_income','cash_net']
        cursor=first.replace(month=1,day=1) if kind=='annual' else first.replace(day=1)
        while cursor<=last:
            after=date(cursor.year+1,1,1) if kind=='annual' else month_add(cursor,1)
            rows.append({'period':str(cursor.year) if kind=='annual' else cursor.strftime('%Y-%m'),**totals(cs,ps,es,max(first,cursor),min(last,after-timedelta(days=1)))})
            cursor=after
    elif kind=='expenses':
        columns=['date','property','category','amount','reference']
        rows=[{'id':e.id,'date':local_day(e.spent_at).isoformat(),'property':e.property.name if e.property else '', 'category':e.category,'amount':e.amount,'reference':e.invoice_reference or ''} for e in es if first<=local_day(e.spent_at)<=last and (not category or e.category==category)]
    elif kind=='collections':
        columns=['date','property','tenant','contract','amount','reference']
        rows=[{'id':p.id,'date':local_day(p.paid_at).isoformat(),'property':p.contract.property.name if p.contract and p.contract.property else '', 'tenant':p.contract.tenant.name if p.contract and p.contract.tenant else '', 'contract':p.contract_id,'amount':p.amount,'reference':p.transaction_code or ''} for p in ps if first<=local_day(p.paid_at)<=last]
    elif kind=='overdue':
        columns=['date','property','tenant','contract','amount','outstanding']
        for c in cs:
            for due in outstanding(c,ps):
                if due['overdue'] and first<=date.fromisoformat(due['due_date'])<=last:rows.append({'date':due['due_date'],'property':due['property'],'tenant':due['tenant'],'contract':c.id,'amount':due['amount'],'outstanding':due['outstanding']})
    elif kind=='contracts':
        columns=['contract','property','tenant','start','end','status','amount']
        for c in cs:
            v=contract_view(c)
            if local_day(c.start_date)<=last and local_day(c.end_date)>=first and (not status or v['status']==status):rows.append({'contract':c.id,'property':v['property_name'],'tenant':v['tenant_name'],'start':local_day(c.start_date).isoformat(),'end':local_day(c.end_date).isoformat(),'status':v['status'],'amount':c.monthly_rent})
    else:
        columns=['property','units','registered_units','occupied'] if kind=='properties' else ['property','revenue','collections','expenses','net_income','cash_net']
        props=scope(db,Property,user,include_archived=True)
        if property_id:props=props.filter(Property.id==property_id)
        for p in props:
            units=scope(db,Unit,user,include_archived=True).filter(Unit.property_id==p.id).all()
            row={'property':p.name,'units':p.total_units,'registered_units':len(units),'occupied':sum(unit_view(db,u,user)['status']=='occupied' for u in units)}
            if kind=='performance':row.update(totals([c for c in cs if c.property_id==p.id],[pmt for pmt in ps if pmt.contract and pmt.contract.property_id==p.id],[e for e in es if e.property_id==p.id],first,last))
            rows.append(row)
    titles={'revenue':'Revenue report','expenses':'Expenses report','collections':'Collections report','overdue':'Overdue rent report','contracts':'Contracts report','properties':'Properties & units report','performance':'Property performance','monthly':'Monthly report','annual':'Annual report'}
    return {'title':titles[kind],'kind':kind,'property_name':get(db,Property,property_id,user).name if property_id else 'All properties','start':first,'end':last,'columns':[{'key':key,'label':labels[key]} for key in columns],'rows':rows,'count':len(rows),'total':rounded(sum(r.get('outstanding',r.get('amount',0)) for r in rows)) if kind in ('overdue','expenses','collections') else None,'basis':'Contractual revenue is prorated over calendar days; collections use the payment date. Overdue installments follow the monthly contract anniversary, allocating payments oldest first. Only detailed registered units have confirmed occupancy.','generated_at':datetime.utcnow()}

@router.get('/reports/export.xlsx')
def export_report(kind:ReportKind='monthly',preset:Preset='6',start:Optional[date]=None,end:Optional[date]=None,property_id:Optional[int]=None,status:Optional[str]=None,category:Optional[str]=None,language:Literal['ar','en']='en',db=DB,user=UserDep):
    result=report(kind,preset,start,end,property_id,status,category,db,user)
    columns=result['columns'];headers=[label(c['label'],language) for c in columns];rows=[[r.get(c['key'],'') for c in columns] for r in result['rows']]
    return Response(xlsx(headers,rows,rtl=language=='ar'),media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',headers={'Content-Disposition':f'attachment; filename="WAMEED-{kind}-{result["start"]}-{result["end"]}.xlsx"','Cache-Control':'no-store'})
