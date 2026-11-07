from datetime import datetime, timedelta
from app.models.user import User, VerificationChallenge, CustomerAccount
from app.tests.test_saas import make, headers

def test_email_delivery_confirmation_and_replay(client,db,monkeypatch):
    from app import mailer
    delivered=[]
    monkeypatch.setattr(mailer,'configured',lambda:True)
    monkeypatch.setattr(mailer,'send_verification_link',lambda email,token: delivered.append((email,token)) or True)
    u=make(db,'emailcheck');h=headers(client,'emailcheck')
    assert client.post('/api/verification/email/send',headers=h).status_code==200
    assert client.post('/api/verification/email/send',headers=h).status_code==429
    token=delivered[0][1]
    assert db.query(VerificationChallenge).one().token_hash!=token
    assert client.post('/api/verification/email/confirm',json={'token':token}).status_code==200
    assert client.post('/api/verification/email/confirm',json={'token':token}).status_code==400
    assert client.get('/api/verification/status',headers=h).json()['email_verified'] is True

def test_email_changed_invalidates_link(client,db,monkeypatch):
    from app import mailer
    tokens=[]
    monkeypatch.setattr(mailer,'configured',lambda:True)
    monkeypatch.setattr(mailer,'send_verification_link',lambda email,token: tokens.append(token) or True)
    u=make(db,'emailchange');h=headers(client,'emailchange')
    assert client.post('/api/verification/email/send',headers=h).status_code==200
    u.email='changed@example.com';db.commit()
    assert client.post('/api/verification/email/confirm',json={'token':tokens[0]}).status_code==400

def test_missing_provider_is_not_success(client,db,monkeypatch):
    from app import mailer,phone_provider
    monkeypatch.setattr(mailer,'configured',lambda:False)
    monkeypatch.setattr(phone_provider,'configured',lambda:False)
    make(db,'noprovider');h=headers(client,'noprovider')
    assert client.post('/api/verification/email/send',headers=h).status_code==503
    assert client.post('/api/verification/phone/send',headers=h,json={'phone':'+966500000001'}).status_code==503
    assert db.query(VerificationChallenge).count()==0

def test_phone_attempts_isolation_and_success(client,db,monkeypatch):
    from app import phone_provider
    monkeypatch.setattr(phone_provider,'configured',lambda:True)
    monkeypatch.setattr(phone_provider,'send',lambda phone:True)
    monkeypatch.setattr(phone_provider,'check',lambda phone,code: code=='123456')
    make(db,'phoneone');make(db,'phonetwo')
    h=headers(client,'phoneone');other=headers(client,'phonetwo')
    assert client.post('/api/verification/phone/send',headers=h,json={'phone':'+966500000001'}).status_code==200
    assert client.post('/api/verification/phone/confirm',headers=other,json={'code':'123456'}).status_code==400
    assert client.post('/api/verification/phone/confirm',headers=h,json={'code':'000000'}).status_code==400
    assert client.post('/api/verification/phone/confirm',headers=h,json={'code':'123456'}).status_code==200
    assert client.post('/api/verification/phone/confirm',headers=h,json={'code':'123456'}).status_code==400
    assert client.get('/api/verification/status',headers=h).json()['phone_verified'] is True

def test_expiry_prevents_writes_and_annual_renewal_restores(client,db):
    u=make(db,'renewuser');make(db,'renewroot','super_admin')
    account=db.get(CustomerAccount,u.customer_account_id);account.subscription_expires_at=datetime.utcnow()-timedelta(days=1);db.commit()
    h=headers(client,'renewuser');root=headers(client,'renewroot')
    assert client.get('/api/real-estate/properties',headers=h).status_code==200
    assert client.post('/api/real-estate/properties',headers=h,json={}).status_code==402
    future=(datetime.utcnow()+timedelta(days=365)).isoformat()+'Z'
    assert client.put(f'/api/admin/users/{u.id}/subscription',headers=h,json={'subscription_tier':'annual','expires_at':future}).status_code==403
    assert client.put(f'/api/admin/users/{u.id}/subscription',headers=root,json={'subscription_tier':'annual','expires_at':future}).status_code==200
    assert client.post('/api/real-estate/properties',headers=h,json={}).status_code==422
