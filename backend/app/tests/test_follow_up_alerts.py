from datetime import datetime,date
from app.tests.test_platform import estate
from app.models.real_estate import RentPayment,ContractStatus
from app.models.operations import MaintenanceRequest
from app.models.user import RolePolicy
BASE='/api/real-estate'

def test_installment_remaining_amount_dates_and_settlement(client,db,estate):
    owner,p,t,c,h,other=estate
    # Jan 15: first installment was partially paid (3100 - 1000).
    result=client.get(BASE+'/alerts',headers=h);assert result.status_code==200
    data=result.json();row=next(a for a in data['items'] if a['type']=='overdue')
    assert row['amount']==2100 and row['date']=='2026-01-01' and row['days_until']==-14
    assert row['property_id']==p.id and row['is_overdue'] and row['id']
    assert row['href']==f'/contracts/{c.id}'
    assert client.get(BASE+'/alerts',headers=other).json()['items']==[]
    # Recomputes from actual payments; no persisted dismissal hides unpaid rent.
    db.add(RentPayment(customer_account_id=owner.customer_account_id,contract_id=c.id,amount=2100,paid_at=datetime(2026,1,15)));db.commit()
    assert not any(a['type']=='overdue' for a in client.get(BASE+'/alerts',headers=h).json()['items'])
    from app.routers import operations
    # The next installment appears only when it enters the 7-day window.
    operations_now=operations.today
    try:
        operations.today=lambda:date(2026,1,25)
        rows=client.get(BASE+'/alerts',headers=h).json()['items']
        due=next(a for a in rows if a['type']=='due')
        assert due['date']=='2026-02-01' and due['days_until']==7 and due['amount']==3100
    finally:operations.today=operations_now

def test_contract_and_maintenance_follow_up_disappear_when_resolved(client,db,estate):
    owner,p,t,c,h,other=estate
    c.end_date=datetime(2026,1,20)
    old=MaintenanceRequest(customer_account_id=owner.customer_account_id,property_id=p.id,title='Overdue maintenance',due_date=datetime(2026,1,14))
    upcoming=MaintenanceRequest(customer_account_id=owner.customer_account_id,property_id=p.id,title='Upcoming maintenance',due_date=datetime(2026,1,22))
    completed=MaintenanceRequest(customer_account_id=owner.customer_account_id,property_id=p.id,title='Completed',due_date=datetime(2026,1,1),status='completed')
    far=MaintenanceRequest(customer_account_id=owner.customer_account_id,property_id=p.id,title='Later',due_date=datetime(2026,2,1))
    db.add_all([old,upcoming,completed,far]);db.commit()
    data=client.get(BASE+'/alerts',headers=h).json();rows=data['items']
    expiring=next(a for a in rows if a['type']=='expiring');assert expiring['days_until']==5
    ms=[a for a in rows if a['type']=='maintenance'];assert len(ms)==2
    assert {a['days_until'] for a in ms}=={-1,7}
    assert all(a['property_id']==p.id and a['property_name']==p.name for a in ms)
    assert any(a['href']==f'/maintenance?record={old.id}' for a in ms)
    old.status='completed';upcoming.archived_at=datetime(2026,1,15);c.status=ContractStatus.CANCELLED;db.commit()
    rows=client.get(BASE+'/alerts',headers=h).json()['items']
    assert not any(a['type'] in ('maintenance','expiring','overdue','due','renewal') for a in rows)

def test_permissions_and_existing_dashboard_contract(client,db,estate):
    owner,p,t,c,h,other=estate
    db.add(RolePolicy(role=owner.role,permissions=['dashboard:read','contracts:read']));db.commit()
    rows=client.get(BASE+'/alerts',headers=h).json()['items']
    assert not any(a['type'] in ('overdue','due','maintenance') for a in rows)
    assert client.get(BASE+'/dashboard/alerts',headers=h).json()==client.get(BASE+'/alerts',headers=h).json()
    db.query(RolePolicy).filter(RolePolicy.role==owner.role).update({'permissions':['contracts:read']});db.commit()
    assert client.get(BASE+'/alerts',headers=h).status_code==403
    assert client.get(BASE+'/alerts').status_code==401

def test_renewal_clears_old_contract_reminder_but_keeps_unpaid_rent(client,db,estate,monkeypatch):
    owner,p,t,c,h,other=estate
    c.end_date=datetime(2026,1,14);db.commit()
    assert any(a['type']=='renewal' for a in client.get(BASE+'/alerts',headers=h).json()['items'])
    result=client.post(f'{BASE}/contracts/{c.id}/renew',headers=h,json={'start_date':'2026-01-15','end_date':'2027-01-14','monthly_rent':3100})
    assert result.status_code==201,result.text
    rows=client.get(BASE+'/alerts',headers=h).json()['items']
    assert not any(a['type']=='renewal' and a['href']==f'/contracts/{c.id}' for a in rows)
    assert any(a['type']=='overdue' and a['href']==f'/contracts/{c.id}' for a in rows)

    from app.routers import operations
    monkeypatch.setattr(operations,'today',lambda:date(2027,1,15))
    rows=client.get(BASE+'/alerts',headers=h).json()['items']
    assert not any(a['type']=='renewal' and a['href']==f'/contracts/{c.id}' for a in rows)
    assert any(a['type']=='renewal' and a['href']==f'/contracts/{result.json()["id"]}' for a in rows)
