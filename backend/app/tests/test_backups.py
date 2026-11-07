import io,json,zipfile,os
from datetime import datetime,timedelta,timezone
from pathlib import Path
import pytest
from sqlalchemy import delete
from app.services import backups
from app.config import settings
from app.models.user import User,CustomerAccount,AuditLog
from app.models.operations import Unit,Attachment
from app.models.real_estate import Property,RentPayment
from app.tests.test_platform import estate
from app.tests.test_saas import make,headers

@pytest.fixture(autouse=True)
def private_backups(tmp_path,monkeypatch):
    monkeypatch.setattr(settings,'BACKUP_DIR',str(tmp_path/'backups'))
    monkeypatch.setattr(settings,'BACKUP_RETENTION_COUNT',2)

@pytest.fixture
def admin(client,db):
    user=make(db,'platformadmin','super_admin')
    return user,headers(client,'platformadmin')

def test_daily_snapshot_private_verified_retention_and_failure(db,estate,monkeypatch):
    worker=backups.BackupWorker(db.get_bind())
    worker.tick();rows=backups.list_snapshots();assert len(rows)==1 and rows[0]['verified']
    worker.tick();assert len(backups.list_snapshots())==1
    assert os.stat(settings.BACKUP_DIR).st_mode&0o777==0o700
    assert os.stat(Path(settings.BACKUP_DIR)/(rows[0]['id']+'.sqlite')).st_mode&0o777==0o600
    first=backups.now();monkeypatch.setattr(backups,'now',lambda:first+timedelta(hours=25))
    worker.tick();assert len(backups.list_snapshots())==2
    backups.create_snapshot(db.get_bind(),'manual');assert len(backups.list_snapshots())==2
    broken=backups.list_snapshots()[0]['id'];path=Path(settings.BACKUP_DIR)/(broken+'.sqlite');path.write_bytes(b'corrupt')
    with pytest.raises(Exception) as exc:backups.read_snapshot(broken)
    assert exc.value.status_code==409
    monkeypatch.setattr(backups,'now',lambda:first+timedelta(hours=26))
    worker=backups.BackupWorker(db.get_bind())
    worker.tick();assert backups.list_snapshots()[0]['id']!=broken
    assert backups.read_snapshot(backups.list_snapshots()[0]['id'])

def test_customer_export_only_owner_and_no_credentials(client,db,estate):
    owner,p,t,c,h,other=estate
    db.add(Attachment(customer_account_id=owner.customer_account_id,resource='properties',record_id=p.id,filename='../my.pdf',content_type='application/pdf',content=b'%PDF-private'))
    p.archived_at=datetime.now(timezone.utc);db.commit()
    r=client.get('/api/account/data-export',headers=h);assert r.status_code==200,r.text
    assert 'no-store' in r.headers['cache-control']
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        payload=json.loads(z.read('data.json'));data=payload['records']
        assert len(data['properties'])==1 and data['properties'][0]['archived_at']
        assert len(data['rent_payments'])==1 and data['rent_payments'][0]['amount']==1000
        assert z.read(data['record_attachments'][0]['file'])==b'%PDF-private'
        assert all('..' not in n for n in z.namelist())
        assert not any(secret in z.read('data.json').decode() for secret in ['hashed_password','token_version','password_resets','role_policies'])
    employee=make(db,'teammember','admin');employee.customer_account_id=owner.customer_account_id;db.commit()
    member=headers(client,'teammember')
    assert client.get('/api/account/data-export/status',headers=member).json()=={'allowed':False}
    assert client.get('/api/account/data-export',headers=member).status_code==403
    for path in ['/api/admin/backups']:
        assert client.get(path,headers=h).status_code==403
        assert client.post(path,headers=h).status_code==403
    assert client.post('/api/admin/backups/fake/restore',headers=h,json={'account_id':owner.customer_account_id,'token':'x'*30,'confirmation':'a'}).status_code==403

def test_admin_restore_atomic_scoped_safety_and_audit(client,db,estate,admin):
    owner,p,t,c,h,other=estate;actor,root=admin
    pid=p.id;account_id=owner.customer_account_id
    outsider=make(db,'outside');outside=Property(name='Other account',property_type='villa',customer_account_id=outsider.customer_account_id);db.add(outside);db.commit();outside_id=outside.id
    db.add(Attachment(customer_account_id=account_id,resource='properties',record_id=pid,filename='test.pdf',content_type='application/pdf',content=b'%PDF-test'));db.commit()
    uid=client.post(f'/api/real-estate/properties/{pid}/units',headers=h,json={'number':'A'}).json()['id']
    snapshot=client.post('/api/admin/backups',headers=root);assert snapshot.status_code==201,snapshot.text
    sid=snapshot.json()['id']
    db.execute(delete(Attachment).where(Attachment.customer_account_id==account_id));p=db.get(Property,pid);p.name='Changed';db.query(RentPayment).filter(RentPayment.contract_id==c.id).update({'amount':50});db.commit()
    preview=client.post(f'/api/admin/backups/{sid}/preview',headers=root,json={'account_id':account_id});assert preview.status_code==200,preview.text
    body=preview.json();assert body['saved']['record_attachments']==1 and body['current']['record_attachments']==0
    response=client.post(f'/api/admin/backups/{sid}/restore',headers=root,json={'account_id':account_id,'token':body['token'],'confirmation':body['account_name']})
    assert response.status_code==200,response.text
    assert db.get(Property,pid).name=='عمارة وميض'
    assert db.query(RentPayment).filter(RentPayment.contract_id==c.id).one().amount==1000
    assert db.query(Attachment).filter(Attachment.customer_account_id==account_id).one().content==b'%PDF-test'
    assert db.get(Unit,uid)
    assert db.get(Property,outside_id).name=='Other account'
    assert db.get(User,owner.id).role=='admin'
    assert db.query(AuditLog).filter(AuditLog.action=='backup.restore').count()==1
    assert backups.read_snapshot(response.json()['safety_backup'])
    again=client.post(f'/api/admin/backups/{sid}/restore',headers=root,json={'account_id':account_id,'token':body['token'],'confirmation':body['account_name']})
    assert again.status_code==409

def test_stale_tampered_wrong_confirmation_and_storage_failure(client,db,estate,admin,monkeypatch):
    owner,p,t,c,h,other=estate;actor,root=admin;aid=owner.customer_account_id
    sid=client.post('/api/admin/backups',headers=root).json()['id']
    preview=client.post(f'/api/admin/backups/{sid}/preview',headers=root,json={'account_id':aid}).json()
    request={'account_id':aid,'token':preview['token'],'confirmation':'wrong'}
    assert client.post(f'/api/admin/backups/{sid}/restore',headers=root,json=request).status_code==422
    request['confirmation']=preview['account_name'];request['token']=request['token']+'x'
    assert client.post(f'/api/admin/backups/{sid}/restore',headers=root,json=request).status_code==409
    request['token']=preview['token'];p.name='New changes';db.commit()
    assert client.post(f'/api/admin/backups/{sid}/restore',headers=root,json=request).status_code==409
    assert db.get(Property,p.id).name=='New changes'
    preview=client.post(f'/api/admin/backups/{sid}/preview',headers=root,json={'account_id':aid}).json();request['token']=preview['token']
    def fail(*a,**kw):raise OSError('full')
    monkeypatch.setattr(backups,'create_snapshot',fail)
    assert client.post(f'/api/admin/backups/{sid}/restore',headers=root,json=request).status_code==503
    assert db.get(Property,p.id).name=='New changes'

def test_restore_rolls_back_every_record_on_insert_failure(client,db,estate,admin,monkeypatch):
    owner,p,t,c,h,other=estate;actor,root=admin;aid=owner.customer_account_id;pid=p.id
    sid=client.post('/api/admin/backups',headers=root).json()['id']
    p.name='Keep current data';db.commit()
    preview=client.post(f'/api/admin/backups/{sid}/preview',headers=root,json={'account_id':aid}).json()
    original=backups.convert_rows
    def fail(table,rows):
        if table.name=='contracts':raise ValueError('injected insertion failure')
        return original(table,rows)
    monkeypatch.setattr(backups,'convert_rows',fail)
    response=client.post(f'/api/admin/backups/{sid}/restore',headers=root,json={'account_id':aid,'token':preview['token'],'confirmation':preview['account_name']})
    assert response.status_code==409,response.text
    assert db.get(Property,pid).name=='Keep current data'
    assert db.query(RentPayment).filter(RentPayment.contract_id==c.id).count()==1
    assert db.query(AuditLog).filter(AuditLog.action=='backup.restore').count()==0
