from datetime import datetime,date
import io,zipfile
import pytest
from app.models.real_estate import Property,Contract,Tenant,RentPayment,PropertyExpense
from app.models.operations import Unit
from app.models.user import RolePolicy
from app.tests.test_saas import make,headers
from app.services.financials import dues_for,outstanding,revenue,month_add

@pytest.fixture
def estate(client,db,monkeypatch):
    from app.services import financials
    from app.routers import operations
    monkeypatch.setattr(financials,'today',lambda:date(2026,1,15))
    monkeypatch.setattr(operations,'today',lambda:date(2026,1,15))
    owner=make(db,'owner');other=make(db,'other')
    p=Property(name='عمارة وميض',property_type='apartment',total_units=2,customer_account_id=owner.customer_account_id)
    db.add(p);db.flush()
    t=Tenant(name='سعد',phone='+966512345678',email='tenant@example.com',property_id=p.id,contract_start_date=datetime(2026,1,1),contract_end_date=datetime(2026,12,31),customer_account_id=owner.customer_account_id)
    db.add(t);db.flush()
    c=Contract(property_id=p.id,tenant_id=t.id,start_date=datetime(2026,1,1),end_date=datetime(2026,12,31),monthly_rent=3100,customer_account_id=owner.customer_account_id)
    db.add(c);db.flush()
    db.add_all([RentPayment(contract_id=c.id,amount=1000,paid_at=datetime(2026,1,10),customer_account_id=owner.customer_account_id),PropertyExpense(property_id=p.id,amount=200,category='صيانة',spent_at=datetime(2026,1,12),customer_account_id=owner.customer_account_id)])
    db.commit()
    return owner,p,t,c,headers(client,'owner'),headers(client,'other')

def test_finance_period_accrual_fifo_and_export(client,db,estate):
    _,p,t,c,h,other=estate
    query='preset=custom&start=2026-01-01&end=2026-01-31'
    result=client.get('/api/real-estate/dashboard/analytics?'+query,headers=h)
    assert result.status_code==200,result.text
    total=result.json()['totals'];assert total=={'revenue':3100,'collections':1000,'expenses':200,'net_income':2900,'cash_net':800}
    due=client.get(f'/api/real-estate/contracts/{c.id}/overview',headers=h).json()['dues']
    assert due[0]['outstanding']==2100 and due[0]['overdue']
    alerts=client.get('/api/real-estate/dashboard/alerts',headers=h).json()
    assert alerts['counts']['overdue']==1
    assert client.get('/api/real-estate/dashboard/alerts',headers=other).json()['items']==[]
    report=client.get('/api/real-estate/reports/data?kind=overdue&'+query,headers=h).json()
    assert report['total']==2100
    response=client.get('/api/real-estate/reports/export.xlsx?kind=monthly&'+query,headers=h)
    assert response.status_code==200
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        xml=archive.read('xl/worksheets/sheet1.xml').decode()
        assert '3100' in xml and 'WAMEED' not in xml
    assert client.get('/api/real-estate/reports/data?'+query+f'&property_id={p.id}',headers=other).status_code==404
    assert client.get('/api/real-estate/dashboard/analytics?preset=custom&start=2026-02-01&end=2026-01-01',headers=h).status_code==422

def test_unit_links_and_cross_account_protection(client,db,estate):
    _,p,t,c,h,other=estate
    r=client.post(f'/api/real-estate/properties/{p.id}/units',headers=h,json={'number':'A-101'})
    assert r.status_code==201,r.text
    uid=r.json()['id']
    assert client.put(f'/api/real-estate/contracts/{c.id}/unit',headers=h,json={'unit_id':uid}).status_code==200
    detail=client.get(f'/api/real-estate/units/{uid}',headers=h).json()
    assert detail['status']=='occupied' and detail['tenant_id']==t.id
    for path in (f'properties/{p.id}/overview',f'units/{uid}',f'tenants/{t.id}/overview',f'contracts/{c.id}/overview'):
        assert client.get('/api/real-estate/'+path,headers=other).status_code==404
    assert client.get('/api/real-estate/search?q=A-101',headers=other).json()['items']==[]
    hits=client.get('/api/real-estate/search?q=سعد',headers=h).json()['items']
    assert any(x['type']=='Tenant' for x in hits)
    hits=client.get('/api/real-estate/search?q=512345',headers=h).json()['items'];assert len(hits)==1
    assert client.put(f'/api/real-estate/units/{uid}',headers=h,json={'number':'A-101','status':'maintenance'}).status_code==409

def test_maintenance_archive_restore_and_private_files(client,db,estate):
    _,p,t,c,h,other=estate
    response=client.post('/api/real-estate/maintenance',headers=h,json={'property_id':p.id,'title':'إصلاح تسرب','due_date':'2026-01-16T12:00:00'})
    assert response.status_code==201,response.text
    mid=response.json()['id']
    uploaded=client.post(f'/api/real-estate/files/maintenance/{mid}',headers=h,files={'file':('فاتورة.pdf',b'%PDF-1.7\nexample','application/pdf')})
    assert uploaded.status_code==201,uploaded.text
    fid=uploaded.json()['id']
    assert client.get(f'/api/real-estate/files/{fid}',headers=other).status_code==404
    assert client.get(f'/api/real-estate/files/{fid}',headers=h).content.startswith(b'%PDF-')
    assert client.post(f'/api/real-estate/files/maintenance/{mid}',headers=h,files={'file':('hack.svg',b'<svg/>','image/svg+xml')}).status_code==422
    assert client.delete(f'/api/real-estate/maintenance/{mid}',headers=h).status_code==204
    assert client.get('/api/real-estate/maintenance',headers=h).json()==[]
    assert client.post(f'/api/real-estate/maintenance/{mid}/restore',headers=other).status_code==404
    assert client.post(f'/api/real-estate/maintenance/{mid}/restore',headers=h).status_code==200
    assert len(client.get('/api/real-estate/maintenance',headers=h).json())==1

def test_restricted_role_does_not_leak_through_search_reports(client,db,estate):
    _,p,t,c,h,other=estate
    db.add(RolePolicy(role='admin',permissions=['properties:read','properties:create']))
    db.commit()
    assert client.get('/api/real-estate/search?q=سعد',headers=h).json()['items']==[]
    assert client.get('/api/real-estate/dashboard/analytics',headers=h).status_code==403
    assert client.get('/api/real-estate/reports/data?kind=collections',headers=h).status_code==403
    assert client.post('/api/real-estate/maintenance',headers=h,json={'property_id':p.id,'title':'صيانة'}).status_code==403
    assert client.post('/api/real-estate/properties',headers=h,json={'name':'عقار جديد','property_type':'apartment'}).status_code==201
    assert client.put(f'/api/real-estate/properties/{p.id}',headers=h,json={'name':'تعديل ممنوع'}).status_code==403

def test_calendar_end_month_and_partial_final_period():
    assert month_add(date(2024,1,31),1)==date(2024,2,29)
    c=Contract(id=1,property_id=1,tenant_id=1,start_date=datetime(2024,1,31),end_date=datetime(2024,3,15),monthly_rent=2900)
    from app.models.real_estate import ContractStatus
    c.status=ContractStatus.ACTIVE
    dues=dues_for(c)
    assert [d['date'] for d in dues]==[date(2024,1,31),date(2024,2,29)]
    assert dues[0]['amount']==2900
    assert float(revenue(c,date(2024,2,1),date(2024,2,29)))==2900

def test_duplicate_units_nonfinite_amounts_and_body_limits(client,db,estate):
    _,p,t,c,h,other=estate
    path=f'/api/real-estate/properties/{p.id}/units'
    assert client.post(path,headers=h,json={'number':'101'}).status_code==201
    assert client.post(path,headers=h,json={'number':'101'}).status_code==409
    assert client.post(path,headers=h,json={'number':'  '}).status_code==422
    response=client.post('/api/real-estate/expenses',headers={**h,'Content-Type':'application/json'},content=f'{{"property_id":{p.id},"amount":NaN,"category":"test","spent_at":"2026-01-10T12:00:00"}}')
    assert response.status_code==422
    response=client.post('/api/real-estate/maintenance',headers={**h,'Content-Length':str(7*1024*1024)},content=b'{}')
    assert response.status_code==413
    assert client.get('/api/health').headers['x-content-type-options']=='nosniff'

def test_renewal_preserves_old_contract_and_blocks_overlaps(client,db,estate):
    _,p,t,c,h,other=estate
    payload={'start_date':'2027-01-01','end_date':'2027-12-31','monthly_rent':3300}
    response=client.post(f'/api/real-estate/contracts/{c.id}/renew',headers=h,json=payload)
    assert response.status_code==201,response.text
    assert db.get(Contract,c.id).monthly_rent==3100
    assert db.query(Contract).count()==2
    assert client.post(f'/api/real-estate/contracts/{c.id}/renew',headers=h,json=payload).status_code==409
    assert client.post(f'/api/real-estate/contracts/{c.id}/renew',headers=other,json=payload).status_code==404

def test_summary_never_counts_future_collections(client,db,estate):
    from app.routers import real_estate
    _,p,t,c,h,other=estate
    db.add(RentPayment(contract_id=c.id,amount=999,paid_at=datetime(2099,1,1),customer_account_id=c.customer_account_id))
    db.commit()
    summary=client.get('/api/real-estate/dashboard/summary',headers=h).json()
    assert summary['collected_this_month']!=999

def test_unit_status_does_not_disclose_tenant_without_permission(client,db,estate):
    _,p,t,c,h,other=estate
    u=Unit(property_id=p.id,number='102',customer_account_id=c.customer_account_id)
    db.add(u);db.flush();c.unit_id=u.id;db.add(RolePolicy(role='admin',permissions=['properties:read']));db.commit()
    result=client.get(f'/api/real-estate/units/{u.id}',headers=h)
    assert result.status_code==200
    assert result.json()['tenant'] is None and result.json()['tenant_id'] is None
    assert result.json()['contracts']==[]
    assert client.get('/api/real-estate/dashboard/summary',headers=h).status_code==403

def test_auth_rate_limits_hide_inputs_and_reject_oversized_passwords(client,db):
    from app.models.operations import AuthAttempt
    for _ in range(20):
        assert client.post('/api/auth/login',json={'email':'absent@example.com','password':'wrong'}).status_code==401
    assert client.post('/api/auth/login',json={'email':'absent@example.com','password':'wrong'}).status_code==429
    attempt=db.query(AuthAttempt).first()
    assert attempt.identity_hash!='absent@example.com' and '@' not in attempt.identity_hash
    r=client.post('/api/auth/login',json={'email':'different@example.com','password':'x'*1000})
    assert r.status_code==422 and 'x'*1000 not in r.text

def test_export_cells_are_literal_and_valid_xml():
    from app.services.exports import xlsx
    import xml.etree.ElementTree as ET
    value='=HYPERLINK("https://example.invalid","click")'
    with zipfile.ZipFile(io.BytesIO(xlsx(['وصف'],[[value],['نص <خاص> & آمن']]))) as archive:
        sheet=ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        assert not sheet.findall('.//m:f',ns)
        assert value in [t.text for t in sheet.findall('.//m:t',ns)]

def test_dates_normalize_to_utc_and_numeric_arabic_search(client,db,estate):
    _,p,t,c,h,other=estate
    response=client.post('/api/real-estate/payments',headers=h,json={'contract_id':c.id,'amount':50,'paid_at':'2026-02-01T00:30:00+03:00'})
    assert response.status_code==201,response.text
    payment=db.query(RentPayment).order_by(RentPayment.id.desc()).first()
    assert payment.paid_at==datetime(2026,1,31,21,30)
    response=client.get(f'/api/real-estate/search?q={str(c.id).translate(str.maketrans("0123456789","٠١٢٣٤٥٦٧٨٩"))}',headers=h)
    assert response.status_code==200
    assert any(row['type']=='Contract' and row['id']==c.id for row in response.json()['items'])

def test_excel_language_changes_headers_and_layout_not_customer_records(client,db,estate):
    _,p,t,c,h,other=estate
    query='kind=monthly&preset=custom&start=2026-01-01&end=2026-01-31'
    english=client.get('/api/real-estate/reports/export.xlsx?'+query+'&language=en',headers=h)
    arabic=client.get('/api/real-estate/reports/export.xlsx?'+query+'&language=ar',headers=h)
    assert english.status_code==arabic.status_code==200
    with zipfile.ZipFile(io.BytesIO(english.content)) as z:en=z.read('xl/worksheets/sheet1.xml').decode()
    with zipfile.ZipFile(io.BytesIO(arabic.content)) as z:ar=z.read('xl/worksheets/sheet1.xml').decode()
    assert 'Contractual revenue' in en and 'الإيراد التعاقدي' in ar
    assert 'rightToLeft="0"' in en and 'rightToLeft="1"' in ar
    assert '3100' in en and '3100' in ar
    assert db.get(Tenant,t.id).name=='سعد'
    assert client.get('/api/real-estate/reports/export.xlsx?'+query+'&language=unknown',headers=h).status_code==422


def test_dashboard_counts_occupied_units_from_live_linked_contracts(client, db, estate):
    owner, prop, tenant, contract, auth, _ = estate
    prop.occupied_units = 99  # Legacy count must not override real unit links.
    occupied = Unit(property_id=prop.id, number="LIVE", customer_account_id=owner.customer_account_id)
    future = Unit(property_id=prop.id, number="FUTURE", customer_account_id=owner.customer_account_id)
    db.add_all([occupied, future]); db.flush()
    contract.unit_id = occupied.id
    db.add(Contract(property_id=prop.id, tenant_id=tenant.id, unit_id=future.id,
        start_date=datetime(2099, 1, 1), end_date=datetime(2099, 12, 31),
        monthly_rent=4000, customer_account_id=owner.customer_account_id))
    db.commit()
    result = client.get('/api/real-estate/dashboard/summary', headers=auth)
    assert result.status_code == 200
    assert result.json()['occupied_units'] == 1
