from datetime import datetime
from app.tests.test_platform import estate
from app.models.real_estate import RentPayment,PropertyExpense

def test_six_month_cash_series_uses_recorded_riyadh_dates_and_excludes_future(client,db,estate):
    owner,p,t,c,h,other=estate
    for amount,when in [(10,datetime(2025,12,31,21,30)),(40,datetime(2025,8,31,21)),(999,datetime(2026,1,16)),(999,datetime(2025,7,31,20,59))]:
        db.add(RentPayment(customer_account_id=owner.customer_account_id,contract_id=c.id,amount=amount,paid_at=when))
    db.add(PropertyExpense(customer_account_id=owner.customer_account_id,property_id=p.id,amount=789,category='Future',spent_at=datetime(2026,1,16)))
    db.commit()
    response=client.get('/api/real-estate/dashboard/analytics?preset=6',headers=h)
    assert response.status_code==200,response.text
    data=response.json();rows=data['months']
    assert [r['month'] for r in rows]==['2025-08','2025-09','2025-10','2025-11','2025-12','2026-01']
    assert rows[1]['collections']==40 and rows[-1]['collections']==1010
    assert sum(r['collections'] for r in rows)==1050 and sum(r['expenses'] for r in rows)==200
    assert data['totals']['collections']==1050 and data['totals']['expenses']==200
    isolated=client.get('/api/real-estate/dashboard/analytics?preset=6',headers=other).json()
    assert all(r['collections']==0 and r['expenses']==0 for r in isolated['months'])
