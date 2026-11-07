import hashlib
from app.models.user import User, AuditLog, PasswordReset
from app.models.real_estate import Property
from app.schemas.user import UserCreate
from app.services.auth_service import AuthService
PASSWORD='Test-password-123'
def make(db,name,role='admin'):
    result=AuthService(db).register_user(UserCreate(email=f'{name}@example.com',username=name,password=PASSWORD))
    user=db.get(User,result.id);user.role=role;user.is_superuser=role=='super_admin';db.commit();return user
def headers(client,name):
    r=client.post('/api/auth/login',json={'email':name,'password':PASSWORD});assert r.status_code==200,r.text
    return {'Authorization':f'Bearer {r.json()["access_token"]}'}
def test_tenant_isolation(client,db):
    a=make(db,'alice');make(db,'bobby')
    db.add(Property(property_type='apartment',name='Private',address='Address',customer_account_id=a.customer_account_id));db.commit()
    pid=db.query(Property).first().id;h=headers(client,'bobby')
    assert client.get('/api/real-estate/properties',headers=h).json()==[]
    assert client.get(f'/api/real-estate/properties/{pid}',headers=h).status_code==404
    assert client.put(f'/api/real-estate/properties/{pid}',headers=h,json={'name':'Intrusion'}).status_code==404
    assert db.query(Property).first().name=='Private'
def test_admin_roles_and_audit(client,db):
    make(db,'developer','super_admin');make(db,'employee','employee')
    h=headers(client,'employee');root=headers(client,'developer')
    assert client.get('/api/admin/users',headers=h).status_code==403
    assert client.get('/api/admin/users').status_code==401
    assert client.post('/api/real-estate/properties',headers=h,json={}).status_code==403
    assert client.post('/api/admin/users',headers=root,json={'username':'hacker','email':'hack@example.com','password':PASSWORD,'role':'super_admin'}).status_code==422
    r=client.post('/api/admin/users',headers=root,json={'username':'newclient','email':'new@example.com','password':PASSWORD});assert r.status_code==201,r.text
    assert 'hashed_password' not in r.json()
    assert db.query(AuditLog).filter(AuditLog.action=='user.create').count()==1
    assert client.delete(f'/api/admin/users/{r.json()["id"]}',headers=root).status_code==204
    assert client.put('/api/admin/roles/employee',headers=root,json={'permissions':['properties:read','properties:write']}).status_code==200
    assert client.post('/api/real-estate/properties',headers=h,json={}).status_code==422

def test_password_reset_single_use(client,db):
    u=make(db,'resetuser');h=headers(client,'resetuser');s=AuthService(db);token=s.create_reset_token(u.email);s.save_reset_token(token,u.email)
    assert db.query(PasswordReset).one().token_hash==hashlib.sha256(token.encode()).hexdigest()
    body={'token':token,'new_password':'Updated-password-123'}
    assert client.post('/api/auth/reset-password',json=body).status_code==200
    assert client.post('/api/auth/reset-password',json=body).status_code==400
    assert client.get('/api/auth/me',headers=h).status_code==401

def test_logout_lockout(client,db):
    make(db,'sessionuser');h=headers(client,'sessionuser')
    assert client.post('/api/auth/logout',headers=h).status_code==204
    assert client.get('/api/auth/me',headers=h).status_code==401
    for _ in range(5):assert client.post('/api/auth/login',json={'email':'sessionuser','password':'bad'}).status_code==401
    assert client.post('/api/auth/login',json={'email':'sessionuser','password':PASSWORD}).status_code==401

def test_deactivation_and_developer_scope(client,db):
    admin=make(db,'rootuser','super_admin');customer=make(db,'customer')
    db.add(Property(property_type='apartment',name='Customer property',address='private',customer_account_id=customer.customer_account_id));db.commit()
    root=headers(client,'rootuser');h=headers(client,'customer')
    assert client.get('/api/real-estate/properties',headers=root).json()==[]
    body={'username':customer.username,'email':customer.email,'role':'admin','is_active':False}
    assert client.put(f'/api/admin/users/{customer.id}',headers=root,json=body).status_code==200
    assert client.get('/api/auth/me',headers=h).status_code==401
    assert client.get('/api/admin/stats',headers=root).json()['properties']==1
    assert client.get(f'/api/admin/users/{customer.id}',headers=root).json()['property_count']==1
    assert client.put(f'/api/admin/users/{admin.id}',headers=root,json=body).status_code==403


def test_legacy_superadmin_can_read_pages_without_developer_access(client,db):
    make(db,'legacyroot','superadmin')
    h=headers(client,'legacyroot')
    for path in ('dashboard/summary','properties','tenants','contracts','payments','expenses','meters'):
        response=client.get('/api/real-estate/'+path,headers=h)
        assert response.status_code==200,(path,response.text)
    assert client.get('/api/admin/users',headers=h).status_code==403
    assert client.post('/api/real-estate/properties',headers=h,json={}).status_code==403
