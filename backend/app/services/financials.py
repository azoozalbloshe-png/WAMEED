"""Calendar-aware accrual, contractual monthly dues, and FIFO cash allocation.
No synthetic ledger rows are persisted; imported legacy records remain intact.
"""
from calendar import monthrange
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo
from fastapi import HTTPException
from app.models.real_estate import Contract, ContractStatus, RentPayment, PropertyExpense
from app.models.operations import Unit

RIYADH = ZoneInfo('Asia/Riyadh')
def today(): return datetime.now(RIYADH).date()
def local_day(value):
    if isinstance(value, datetime):
        return value.replace(tzinfo=value.tzinfo or timezone.utc).astimezone(RIYADH).date()
    return value
def cash(value): return Decimal(str(value or 0))
def rounded(value): return float(cash(value).quantize(Decimal('.01'), rounding=ROUND_HALF_UP))
def month_add(day, offset):
    m=day.year*12+day.month-1+offset
    y,month=divmod(m,12)
    return date(y,month+1,min(day.day,monthrange(y,month+1)[1]))
def scope(db, model, user, include_archived=False):
    q=db.query(model).filter(model.customer_account_id == (user.customer_account_id or -1))
    if not include_archived and hasattr(model,'archived_at'): q=q.filter(model.archived_at.is_(None))
    if model is Unit and not include_archived:
        from app.models.real_estate import Property
        q=q.filter(Unit.property_id.in_(db.query(Property.id).filter(Property.archived_at.is_(None))))
    return q

def period(preset='6', start=None, end=None):
    now=today()
    if preset=='custom':
        if not start or not end: raise HTTPException(422,'Select a start and end date.')
    else:
        end=now
        start=date(now.year,1,1) if preset=='year' else month_add(now.replace(day=1),-int(preset)+1)
    if start>end or (end-start).days>3660: raise HTTPException(422,'Invalid period. The maximum range is ten years.')
    return start,end

def contract_live(c, on=None):
    on=on or today()
    return c.status==ContractStatus.ACTIVE and local_day(c.start_date)<=on<=local_day(c.end_date)

def dues_for(c):
    if c.status not in (ContractStatus.ACTIVE,ContractStatus.EXPIRED): return []
    start,end=local_day(c.start_date),local_day(c.end_date)
    if end<start: return []
    count=(end.year-start.year)*12+end.month-start.month+1
    result=[]
    for i in range(min(count,1200)):
        begin=month_add(start,i)
        if begin>end: break
        next_due=month_add(start,i+1)
        days=(min(end+timedelta(days=1),next_due)-begin).days
        amount=cash(c.monthly_rent)*Decimal(days)/Decimal((next_due-begin).days)
        result.append({'date':begin,'amount':cash(rounded(amount))})
    return result

def outstanding(c, payments, as_of=None):
    as_of=as_of or today()
    paid=sum((cash(p.amount) for p in payments if p.contract_id==c.id and local_day(p.paid_at)<=as_of),Decimal(0))
    result=[]
    for due in dues_for(c):
        allocated=min(paid,due['amount']);paid-=allocated
        balance=due['amount']-allocated
        if balance>0:
            result.append({'contract_id':c.id,'property_id':c.property_id,'tenant_id':c.tenant_id,'unit_id':c.unit_id,'tenant':c.tenant.name if c.tenant else '', 'property':c.property.name if c.property else '', 'due_date':due['date'].isoformat(),'amount':rounded(due['amount']),'outstanding':rounded(balance),'overdue':due['date']<as_of,'href':f'/contracts/{c.id}'})
    return result

def revenue(c,start,end):
    if c.status not in (ContractStatus.ACTIVE,ContractStatus.EXPIRED): return Decimal(0)
    first,last=max(start,local_day(c.start_date)),min(end,local_day(c.end_date))
    if first>last: return Decimal(0)
    total=Decimal(0)
    # Calendar-day accrual prorates both partial months without inventing cash receipts.
    cursor=first
    while cursor<=last:
        boundary=min(last,date(cursor.year,cursor.month,monthrange(cursor.year,cursor.month)[1]))
        total+=cash(c.monthly_rent)*Decimal((boundary-cursor).days+1)/Decimal(monthrange(cursor.year,cursor.month)[1])
        cursor=boundary+timedelta(days=1)
    return total

def portfolio(db,user,property_id=None):
    contracts=scope(db,Contract,user)
    if property_id: contracts=contracts.filter(Contract.property_id==property_id)
    contracts=contracts.all(); ids={c.id for c in contracts}
    payments=[p for p in scope(db,RentPayment,user).all() if p.contract_id in ids]
    expenses=scope(db,PropertyExpense,user)
    if property_id: expenses=expenses.filter(PropertyExpense.property_id==property_id)
    return contracts,payments,expenses.all()

def totals(contracts,payments,expenses,start,end):
    earned=sum((revenue(c,start,end) for c in contracts),Decimal(0))
    collected=sum((cash(p.amount) for p in payments if start<=local_day(p.paid_at)<=end),Decimal(0))
    spent=sum((cash(e.amount) for e in expenses if start<=local_day(e.spent_at)<=end),Decimal(0))
    return {'revenue':rounded(earned),'collections':rounded(collected),'expenses':rounded(spent),'net_income':rounded(earned-spent),'cash_net':rounded(collected-spent)}
