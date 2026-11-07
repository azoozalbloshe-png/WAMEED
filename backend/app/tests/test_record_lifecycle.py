from app.tests.test_platform import estate
from app.models.real_estate import Property, Contract, RentPayment
from app.models.operations import MaintenanceRequest
from app.models.user import AuditLog, RolePolicy
BASE='/api/real-estate'

def test_linked_archive_preserves_history_and_restores(client,db,estate):
    owner,p,t,c,h,other=estate
    query='preset=custom&start=2026-01-01&end=2026-01-31'
    before=client.get(BASE+'/dashboard/analytics?'+query,headers=h).json()['totals']
    info=client.get(f'{BASE}/properties/{p.id}/lifecycle',headers=h).json()
    assert not info['can_delete'] and any(x['kind']=='Contracts' for x in info['links'])
    assert client.delete(f'{BASE}/properties/{p.id}',headers=h).status_code==409
    assert client.post(f'{BASE}/properties/{p.id}/archive',headers=other).status_code==404
    assert client.post(f'{BASE}/properties/{p.id}/archive',headers=h).status_code==200
    assert client.get(BASE+'/properties',headers=h).json()==[]
    assert len(client.get(BASE+'/properties?archived_only=true',headers=h).json())==1
    assert client.get(BASE+'/properties?archived_only=true',headers=other).json()==[]
    assert client.get(f'{BASE}/properties/{p.id}/overview',headers=h).status_code==200
    assert client.get(BASE+'/dashboard/analytics?'+query,headers=h).json()['totals']==before
    report=client.get(BASE+'/reports/data?kind=properties&'+query,headers=h)
    assert report.status_code==200 and p.name in report.text
    assert db.query(Contract).count()==1 and db.query(RentPayment).count()==1
    assert client.post(f'{BASE}/properties/{p.id}/units',headers=h,json={'number':'blocked'}).status_code==409
    assert client.post(f'{BASE}/properties/{p.id}/restore',headers=h).status_code==200
    assert len(client.get(BASE+'/properties',headers=h).json())==1

def test_empty_delete_and_late_dependency_recheck(client,db,estate):
    owner,p,t,c,h,other=estate
    pid=client.post(BASE+'/properties',headers=h,json={'name':'Disposable','property_type':'apartment','total_units':0}).json()['id']
    assert client.get(f'{BASE}/properties/{pid}/lifecycle',headers=h).json()['can_delete']
    assert client.delete(f'{BASE}/properties/{pid}',headers=other).status_code==404
    uid=client.post(f'{BASE}/properties/{pid}/units',headers=h,json={'number':'101'}).json()['id']
    assert client.delete(f'{BASE}/properties/{pid}',headers=h).status_code==409
    assert client.delete(f'{BASE}/units/{uid}',headers=h).status_code==204
    assert client.get(f'{BASE}/properties/{pid}',headers=h).json()['total_units']==0
    assert client.delete(f'{BASE}/properties/{pid}',headers=h).status_code==204
    assert db.get(Property,pid) is None
    assert db.query(AuditLog).filter(AuditLog.action=='properties.delete').count()==1

def test_unit_archive_parent_restore_and_linked_protection(client,db,estate):
    owner,p,t,c,h,other=estate
    uid=client.post(f'{BASE}/properties/{p.id}/units',headers=h,json={'number':'101'}).json()['id']
    assert client.put(f'{BASE}/contracts/{c.id}/unit',headers=h,json={'unit_id':uid}).status_code==200
    assert client.delete(f'{BASE}/units/{uid}',headers=h).status_code==409
    assert client.post(f'{BASE}/units/{uid}/archive',headers=h).status_code==200
    assert client.get(f'{BASE}/units/{uid}',headers=h).json()['archived_at']
    assert client.get(f'{BASE}/units/{uid}',headers=other).status_code==404
    assert client.post(f'{BASE}/properties/{p.id}/units',headers=h,json={'number':'101'}).status_code==409
    assert client.post(f'{BASE}/properties/{p.id}/archive',headers=h).status_code==200
    assert client.post(f'{BASE}/units/{uid}/restore',headers=h).status_code==409
    assert client.post(f'{BASE}/properties/{p.id}/restore',headers=h).status_code==200
    assert client.post(f'{BASE}/units/{uid}/restore',headers=h).status_code==200
    db.refresh(c);assert c.unit_id==uid

def test_archived_dependents_and_permissions(client,db,estate):
    owner,p,t,c,h,other=estate
    uid=client.post(f'{BASE}/properties/{p.id}/units',headers=h,json={'number':'Empty'}).json()['id']
    from datetime import datetime
    db.add(MaintenanceRequest(customer_account_id=owner.customer_account_id,property_id=p.id,unit_id=uid,title='History',archived_at=datetime.utcnow()))
    db.commit()
    assert client.delete(f'{BASE}/units/{uid}',headers=h).status_code==409
    db.add(RolePolicy(role=owner.role,permissions=['properties:read']));db.commit()
    assert client.get(f'{BASE}/units/{uid}/lifecycle',headers=h).status_code==403
    assert client.post(f'{BASE}/units/{uid}/archive',headers=h).status_code==403
    assert client.delete(f'{BASE}/units/{uid}',headers=h).status_code==403
