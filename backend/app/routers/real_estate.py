from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_active_user
from app.schemas.real_estate import (
    PropertyCreate,
    PropertyUpdate,
    PropertyResponse,
    TenantCreate, TenantUpdate, TenantResponse,
    MeterCreate, MeterResponse, MeterReadingResponse,
    TierBreakdown,  # تم إضافة الاستيراد المفقود لحل مشكلة Pylance
)
from app.services.real_estate_service import RealEstateService

# استيراد النماذج (Models) لمنع خطأ Pylance "is not defined"
from app.models.real_estate import Tenant, Meter, Contract, ContractStatus, Property, RentPayment, PropertyExpense
from app.models.operations import Unit
from app.services.financials import contract_live, today, local_day, month_add
from app.permissions import ensure, allowed
from app.schemas.real_estate import ContractCreate, RentPaymentCreate, PropertyExpenseCreate
from datetime import datetime
from sqlalchemy.exc import IntegrityError

from app.permissions import require_business_permission

router = APIRouter(prefix="/api/real-estate", tags=["Real Estate"], dependencies=[Depends(require_business_permission)])


def account_query(db: Session, model, user: User):
    """Every customer query is scoped in SQL, never only in the UI."""
    if user.customer_account_id is None:
        return db.query(model).filter(model.id == -1)
    return db.query(model).filter(model.customer_account_id == user.customer_account_id)


def account_service(db: Session, user: User):
    return RealEstateService(db, user.customer_account_id if user.customer_account_id is not None else -1)

# =============================== Property Endpoints ===============================

@router.post("/properties", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
def create_property(
    property_data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new property.
    Requires authentication.
    """
    service = account_service(db, current_user)
    return service.create_property(property_data)


@router.get("/properties", response_model=List[PropertyResponse])
def get_properties(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    archived_only: bool = False,
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all properties with pagination.
    Requires authentication.
    """
    service = account_service(db, current_user)
    return service.get_all_properties(skip=skip, limit=limit, archived_only=archived_only, include_archived=include_archived)


@router.get("/properties/{property_id}", response_model=PropertyResponse)
def get_property(property_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    item = account_service(db, current_user).get_property(property_id)
    if item is None:
        raise HTTPException(status_code=404, detail='Property not found.')
    return item


@router.put("/properties/{property_id}", response_model=PropertyResponse)
def update_property(property_id: int, data: PropertyUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if data.total_units is not None and data.total_units < account_query(db, Unit, current_user).filter(Unit.property_id == property_id, Unit.archived_at.is_(None)).count():
        raise HTTPException(422, 'The total unit count cannot be lower than the registered detailed unit count.')
    item = account_service(db, current_user).update_property(property_id, data)
    if item is None:
        raise HTTPException(status_code=404, detail='Property not found.')
    return item


@router.get("/tenants", response_model=List[TenantResponse])
def get_tenants(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return account_service(db, current_user).get_all_tenants(skip, limit)


@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(data: TenantCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    try:
        if data.email and account_query(db, Tenant, current_user).filter(Tenant.email == data.email).first():
            raise HTTPException(status_code=409, detail='This email is already registered to another tenant.')
        if data.national_id and account_query(db, Tenant, current_user).filter(Tenant.national_id == data.national_id).first():
            raise HTTPException(status_code=409, detail='This ID number is already registered to another tenant.')
        if data.contract_end_date <= data.contract_start_date:
            raise HTTPException(status_code=400, detail='The contract end date must be after its start date.')
        if not account_query(db, Property, current_user).filter(Property.id == data.property_id, Property.archived_at.is_(None)).first():
            raise HTTPException(status_code=400, detail='Select a property in your account.')
        return account_service(db, current_user).create_tenant(data)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail='Unable to save the record. Check its fields and linked records.')


@router.get("/contracts")
def get_contracts(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    rows = account_query(db, Contract, current_user).order_by(Contract.end_date.asc()).all()
    return [{"id": c.id, "unit_id": c.unit_id, "property_id": c.property_id, "property_name": c.property.name if c.property else "", "tenant_id": c.tenant_id, "tenant_name": c.tenant.name if c.tenant else "", "start_date": c.start_date, "end_date": c.end_date, "status": "expired" if c.status == ContractStatus.ACTIVE and local_day(c.end_date) < today() else "upcoming" if c.status == ContractStatus.ACTIVE and local_day(c.start_date) > today() else c.status.value if c.status else "", "monthly_rent": c.monthly_rent, "deposit_amount": c.deposit_amount, "notes": c.notes} for c in rows]


@router.post("/contracts", status_code=status.HTTP_201_CREATED)
def create_contract(data: ContractCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    tenant = account_query(db, Tenant, current_user).filter(Tenant.id == data.tenant_id).first()
    prop = account_query(db, Property, current_user).filter(Property.id == data.property_id, Property.archived_at.is_(None)).first()
    if not tenant or not prop:
        raise HTTPException(status_code=400, detail='Select a registered tenant and property.')
    if tenant.property_id != prop.id:
        raise HTTPException(status_code=400, detail="The property does not match this tenant's registered property.")
    if data.end_date <= data.start_date:
        raise HTTPException(status_code=400, detail='The contract end date must be after its start date.')
    duplicate = account_query(db, Contract, current_user).filter(
        Contract.property_id == data.property_id,
        Contract.tenant_id == data.tenant_id,
        Contract.start_date == data.start_date,
        Contract.end_date == data.end_date,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail='This contract is already registered.')
    if data.unit_id:
        unit = account_query(db, Unit, current_user).filter(Unit.id == data.unit_id, Unit.archived_at.is_(None)).first()
        if not unit or unit.property_id != prop.id:
            raise HTTPException(422, 'This unit does not belong to the selected property.')
        if unit.status == 'maintenance' or account_query(db, Contract, current_user).filter(Contract.unit_id == unit.id, Contract.status == ContractStatus.ACTIVE, Contract.start_date <= data.end_date, Contract.end_date >= data.start_date).first():
            raise HTTPException(409, 'This unit is unavailable during the selected period.')
    contract = Contract(**data.model_dump(), customer_account_id=current_user.customer_account_id)
    db.add(contract)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Unable to save the contract: duplicate record or invalid reference.')
    db.refresh(contract)
    return {"id": contract.id, "property_id": contract.property_id, "property_name": prop.name, "tenant_id": contract.tenant_id, "tenant_name": tenant.name, "start_date": contract.start_date, "end_date": contract.end_date, "status": contract.status.value, "monthly_rent": contract.monthly_rent, "deposit_amount": contract.deposit_amount, "notes": contract.notes}


@router.get("/payments")
def get_rent_payments(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    rows = account_query(db, RentPayment, current_user).order_by(RentPayment.paid_at.desc(), RentPayment.id.desc()).all()
    return [{"id": row.id, "contract_id": row.contract_id, "tenant_name": row.contract.tenant.name if row.contract and row.contract.tenant else "", "property_name": row.contract.property.name if row.contract and row.contract.property else "", "amount": row.amount, "paid_at": row.paid_at, "method": row.method, "transaction_code": row.transaction_code, "notes": row.notes} for row in rows]


@router.post("/payments", status_code=status.HTTP_201_CREATED)
def create_rent_payment(data: RentPaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    contract = account_query(db, Contract, current_user).filter(Contract.id == data.contract_id).first()
    if not contract:
        raise HTTPException(status_code=400, detail='Select a registered contract.')
    if data.transaction_code and account_query(db, RentPayment, current_user).filter(RentPayment.transaction_code == data.transaction_code).first():
        raise HTTPException(status_code=409, detail='This transaction reference is already registered.')
    payment = RentPayment(**data.model_dump(), customer_account_id=current_user.customer_account_id)
    db.add(payment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='This transaction reference is already registered.')
    db.refresh(payment)
    return {"id": payment.id, "contract_id": payment.contract_id, "tenant_name": contract.tenant.name if contract.tenant else "", "property_name": contract.property.name if contract.property else "", "amount": payment.amount, "paid_at": payment.paid_at, "method": payment.method, "transaction_code": payment.transaction_code, "notes": payment.notes}


@router.get("/expenses")
def get_property_expenses(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    rows = account_query(db, PropertyExpense, current_user).order_by(PropertyExpense.spent_at.desc(), PropertyExpense.id.desc()).all()
    return [{"id": row.id, "property_id": row.property_id, "unit_id": row.unit_id, "property_name": row.property.name if row.property else "", "amount": row.amount, "category": row.category, "spent_at": row.spent_at, "description": row.description, "invoice_reference": row.invoice_reference} for row in rows]


@router.post("/expenses", status_code=status.HTTP_201_CREATED)
def create_property_expense(data: PropertyExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if not account_query(db, Property, current_user).filter(Property.id == data.property_id, Property.archived_at.is_(None)).first():
        raise HTTPException(status_code=400, detail='Select a registered property.')
    if data.invoice_reference and account_query(db, PropertyExpense, current_user).filter(PropertyExpense.invoice_reference == data.invoice_reference).first():
        raise HTTPException(status_code=409, detail='This invoice number is already registered.')
    if data.unit_id:
        unit = account_query(db, Unit, current_user).filter(Unit.id == data.unit_id, Unit.archived_at.is_(None)).first()
        if not unit or unit.property_id != data.property_id:
            raise HTTPException(422, 'This unit does not belong to the selected property.')
    expense = PropertyExpense(**data.model_dump(), customer_account_id=current_user.customer_account_id)
    db.add(expense)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='This invoice number is already registered.')
    db.refresh(expense)
    return {"id": expense.id, "property_id": expense.property_id, "property_name": expense.property.name, "amount": expense.amount, "category": expense.category, "spent_at": expense.spent_at, "description": expense.description, "invoice_reference": expense.invoice_reference}


@router.get("/meters", response_model=List[MeterResponse])
def get_meters(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return account_service(db, current_user).get_all_meters(skip, limit)


@router.post("/meters", response_model=MeterResponse, status_code=status.HTTP_201_CREATED)
def create_meter(data: MeterCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    try:
        duplicate = account_query(db, Meter, current_user).filter(Meter.meter_number == data.meter_number).first()
        if duplicate:
            raise HTTPException(status_code=409, detail='This meter number is already registered.')
        if not account_query(db, Property, current_user).filter(Property.id == data.property_id, Property.archived_at.is_(None)).first():
            raise HTTPException(status_code=400, detail='Select a property in your account.')
        return account_service(db, current_user).create_meter(data)
    except HTTPException:
        raise
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail='Unable to save the record. Check its fields and linked records.')
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='This meter number is already registered.')


@router.get("/meters/{meter_id}/readings", response_model=List[MeterReadingResponse])
def get_meter_readings(meter_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    service = account_service(db, current_user)
    if not service.get_meter(meter_id):
        raise HTTPException(status_code=404, detail='Meter not found.')
    return service.get_meter_readings(meter_id)


@router.post("/meters/{meter_id}/calculate", response_model=MeterReadingResponse)
def calculate_meter(meter_id: int, current_reading: float = Query(ge=0, allow_inf_nan=False), notes: str = Query("", max_length=3000), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    try:
        reading, meter = account_service(db, current_user).calculate_meter_reading(meter_id, current_reading, current_user.username)
        reading.notes = notes or None
        db.commit()
        return reading
    except ValueError as exc:
        raise HTTPException(status_code=400, detail='Unable to save the record. Check its fields and linked records.')


@router.get("/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    properties = account_query(db, Property, current_user).filter(Property.archived_at.is_(None)).all()
    tenants = account_query(db, Tenant, current_user).all()
    contracts = account_query(db, Contract, current_user).all()
    meters = account_query(db, Meter, current_user).all()
    units = account_query(db, Unit, current_user).filter(Unit.archived_at.is_(None)).all()
    unit_ids = {unit.id for unit in units if unit.property_id in {p.id for p in properties}}
    now = datetime.utcnow()
    active = [
        c for c in contracts
        if contract_live(c)
    ]
    upcoming = [
        c for c in active
        if 0 <= (c.end_date.replace(tzinfo=None) - now).days <= 30
    ]
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    payments = account_query(db, RentPayment, current_user)
    expenses = account_query(db, PropertyExpense, current_user)
    next_month = datetime.combine(month_add(month_start.date(), 1), datetime.min.time())
    payments_this_month = [p for p in payments.all() if today().replace(day=1) <= local_day(p.paid_at) <= today()]
    expenses_this_month = [e for e in expenses.all() if today().replace(day=1) <= local_day(e.spent_at) <= today()]
    if not all(allowed(db,current_user,r) for r in ("properties","tenants","contracts","meters","payments","expenses")):
        raise HTTPException(403,'You do not have permission to view the full dashboard. Use your permitted sections.')
    return {"properties": len(properties), "tenants": len(tenants), "contracts": len(contracts), "active_contracts": len(active), "monthly_rent_due": sum(c.monthly_rent or 0 for c in active), "units": sum(p.total_units or 0 for p in properties), "occupied_units": len({c.unit_id for c in active if c.unit_id in unit_ids}), "meters": len(meters), "upcoming_contracts": [{"id": c.id, "tenant": c.tenant.name if c.tenant else "", "property": c.property.name if c.property else "", "end_date": c.end_date} for c in upcoming], "collections_recorded": payments.first() is not None, "expenses_recorded": expenses.first() is not None, "collected_this_month": sum(p.amount or 0 for p in payments_this_month), "expenses_this_month": sum(e.amount or 0 for e in expenses_this_month)}
