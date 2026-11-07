from datetime import datetime, timedelta
import hashlib
import pytest
from app.models.user import User, PasswordReset, RecoveryRequest
from app.tests.test_saas import make, headers, PASSWORD
from app.services.auth_service import AuthService

@pytest.fixture
def providers(monkeypatch):
    from app import mailer, phone_provider
    emails=[];phones=[]
    monkeypatch.setattr(mailer,'configured',lambda:True)
    monkeypatch.setattr(mailer,'send_reset_code',lambda email,token: emails.append((email,token)) or True)
    monkeypatch.setattr(phone_provider,'recovery_configured',lambda method:True)
    monkeypatch.setattr(phone_provider,'send_recovery',lambda phone,method: phones.append((phone,method)) or True)
    monkeypatch.setattr(phone_provider,'check_recovery',lambda phone,code:code=='123456')
    return emails,phones

def verified_phone(db,name='recoveruser'):
    user=make(db,name);user.phone='+966500000001';user.phone_verified_at=datetime.utcnow();db.commit();return user

def test_email_recovery_end_to_end_and_generic_unknown(client,db,providers):
    user=make(db,'mailrecover');old=headers(client,'mailrecover')
    known=client.post('/api/auth/forgot-password',json={'email':user.email})
    unknown=client.post('/api/auth/forgot-password',json={'email':'absent@example.com'})
    assert known.status_code==unknown.status_code==200
    assert known.json()['message']==unknown.json()['message']
    assert set(known.json())==set(unknown.json())
    assert len(providers[0])==1
    code=providers[0][0][1]
    assert len(code)==6 and code.isascii() and code.isdigit()
    request_id=known.json()['request_id']
    challenge=db.query(RecoveryRequest).filter(RecoveryRequest.user_id==user.id).one()
    assert challenge.code_hash != code and code not in known.text
    assert db.query(PasswordReset).count()==0
    assert client.post('/api/auth/recovery/verify',json={'request_id':unknown.json()['request_id'],'code':code}).status_code==400
    wrong='000000' if code!='000000' else '111111'
    assert client.post('/api/auth/recovery/verify',json={'request_id':request_id,'code':wrong}).status_code==400
    verified=client.post('/api/auth/recovery/verify',json={'request_id':request_id,'code':code})
    assert verified.status_code==200,verified.text
    token=verified.json()['reset_token']
    assert db.query(PasswordReset).one().token_hash==hashlib.sha256(token.encode()).hexdigest()
    assert client.post('/api/auth/recovery/verify',json={'request_id':request_id,'code':code}).status_code==400
    assert client.post('/api/auth/reset-password',json={'token':token,'new_password':'Updated-password-123'}).status_code==200
    assert client.get('/api/auth/me',headers=old).status_code==401
    assert client.post('/api/auth/login',json={'email':user.email,'password':'Updated-password-123'}).status_code==200
    assert client.post('/api/auth/reset-password',json={'token':token,'new_password':'Another-password-123'}).status_code==400

@pytest.mark.parametrize('method',['sms','whatsapp'])
def test_phone_recovery_channels_and_replay(client,db,providers,method):
    user=verified_phone(db);h=headers(client,user.username)
    result=client.post('/api/auth/forgot-password',json={'method':method,'phone':user.phone})
    assert result.status_code==200,result.text
    request_id=result.json()['request_id']
    assert providers[1]==[(user.phone,method)]
    challenge=db.query(RecoveryRequest).one()
    assert challenge.request_hash!=request_id
    assert client.post('/api/auth/recovery/verify',json={'request_id':request_id,'code':'000000'}).status_code==400
    verified=client.post('/api/auth/recovery/verify',json={'request_id':request_id,'code':'123456'})
    assert verified.status_code==200,verified.text
    assert client.post('/api/auth/recovery/verify',json={'request_id':request_id,'code':'123456'}).status_code==400
    reset_token=verified.json()['reset_token']
    assert client.post('/api/auth/reset-password',json={'token':reset_token,'new_password':'New-password-123'}).status_code==200
    assert client.get('/api/auth/me',headers=h).status_code==401
    assert client.post('/api/auth/login',json={'email':user.email,'password':'New-password-123'}).status_code==200

def test_unverified_and_ambiguous_phone_never_recover(client,db,providers):
    user=make(db,'notverified');user.phone='+966500000002';db.commit()
    r=client.post('/api/auth/forgot-password',json={'method':'sms','phone':user.phone})
    assert r.status_code==200 and providers[1]==[]
    assert client.post('/api/auth/recovery/verify',json={'request_id':r.json()['request_id'],'code':'123456'}).status_code==400
    a=verified_phone(db,'sharedone');b=verified_phone(db,'sharedtwo')
    r=client.post('/api/auth/forgot-password',json={'method':'whatsapp','phone':a.phone})
    assert r.status_code==200 and providers[1]==[]
    assert client.post('/api/auth/recovery/verify',json={'request_id':r.json()['request_id'],'code':'123456'}).status_code==400

def test_expiry_attempt_limit_and_cross_channel_cooldown(client,db,providers):
    user=verified_phone(db)
    payload={'method':'sms','phone':user.phone}
    r=client.post('/api/auth/forgot-password',json=payload);rid=r.json()['request_id']
    assert client.post('/api/auth/forgot-password',json={**payload,'method':'whatsapp'}).status_code==429
    for _ in range(5):assert client.post('/api/auth/recovery/verify',json={'request_id':rid,'code':'000000'}).status_code==400
    assert client.post('/api/auth/recovery/verify',json={'request_id':rid,'code':'123456'}).status_code==400
    entry=db.query(RecoveryRequest).one();entry.attempts=0;entry.expires_at=datetime.utcnow()-timedelta(seconds=1);db.commit()
    assert client.post('/api/auth/recovery/verify',json={'request_id':rid,'code':'123456'}).status_code==400

def test_contact_changes_invalidate_challenge_and_reset_grant(client,db,providers):
    user=verified_phone(db)
    result=client.post('/api/auth/forgot-password',json={'method':'sms','phone':user.phone})
    rid=result.json()['request_id']
    token=client.post('/api/auth/recovery/verify',json={'request_id':rid,'code':'123456'}).json()['reset_token']
    user.phone='+966500000003';db.commit()
    assert client.post('/api/auth/reset-password',json={'token':token,'new_password':'New-password-123'}).status_code==400
    service=AuthService(db);email_token=service.create_reset_token(user.email);service.save_reset_token(email_token,user.email)
    user.email='changed@example.com';db.commit()
    assert client.post('/api/auth/reset-password',json={'token':email_token,'new_password':'New-password-123'}).status_code==400

def test_unavailable_services_and_invalid_destinations(client,db,monkeypatch):
    from app import mailer,phone_provider
    monkeypatch.setattr(mailer,'configured',lambda:False)
    monkeypatch.setattr(phone_provider,'recovery_configured',lambda method:False)
    assert client.get('/api/auth/recovery-options').json()=={'email':False,'sms':False,'whatsapp':False}
    assert client.post('/api/auth/forgot-password',json={'email':'valid@example.com'}).status_code==503
    assert client.post('/api/auth/forgot-password',json={'method':'sms','phone':'+966500000001'}).status_code==503
    for body in [{'method':'fax','email':'x@example.com'},{'method':'sms'},{'method':'whatsapp','phone':'0500000001'},{'email':'bad'}]:
        assert client.post('/api/auth/forgot-password',json=body).status_code==422

def test_registration_stores_phone_without_marking_verified(client,db):
    r=client.post('/api/auth/register',json={'username':'newphone','email':'newphone@example.com','password':PASSWORD,'phone':'+966500000004'})
    assert r.status_code==201,r.text
    assert r.json()['phone']=='+966500000004' and r.json()['phone_verified_at'] is None

def test_provider_payloads_and_separate_service(monkeypatch):
    from app import phone_provider
    from app.config import settings
    monkeypatch.setattr(settings,'TWILIO_API_KEY','test')
    monkeypatch.setattr(settings,'TWILIO_API_SECRET','test')
    monkeypatch.setattr(settings,'TWILIO_VERIFY_SERVICE_SID','verification-service')
    monkeypatch.setattr(settings,'TWILIO_RECOVERY_SERVICE_SID','recovery-service')
    monkeypatch.setattr(settings,'RECOVERY_SMS_ENABLED',True)
    monkeypatch.setattr(settings,'RECOVERY_WHATSAPP_ENABLED',True)
    calls=[]
    monkeypatch.setattr(phone_provider,'call',lambda resource,payload,service_id=None:calls.append((resource,payload,service_id)) or {'status':'pending' if resource=='Verifications' else 'approved'})
    for method in ['sms','whatsapp']:
        assert phone_provider.send_recovery('+966500000001',method)
        assert calls[-1]==('Verifications',{'To':'+966500000001','Channel':method},'recovery-service')
    assert phone_provider.check_recovery('+966500000001','123456')
    assert calls[-1][2]=='recovery-service'
    monkeypatch.setattr(settings,'TWILIO_RECOVERY_SERVICE_SID','verification-service')
    assert phone_provider.recovery_configured('sms') is False


@pytest.mark.parametrize('reason',['expired','attempts','email_changed','version_changed','deactivated'])
def test_email_code_invalidated_and_does_not_create_grant(client,db,providers,reason):
    user=make(db,'emailcode')
    response=client.post('/api/auth/forgot-password',json={'email':user.email})
    request_id=response.json()['request_id'];code=providers[0][0][1]
    entry=db.query(RecoveryRequest).one()
    if reason=='expired': entry.expires_at=datetime.utcnow()-timedelta(seconds=1)
    elif reason=='attempts': entry.attempts=5
    elif reason=='email_changed': user.email='different@example.com'
    elif reason=='version_changed': user.token_version+=1
    else: user.is_active=False
    db.commit()
    assert client.post('/api/auth/recovery/verify',json={'request_id':request_id,'code':code}).status_code==400
    assert db.query(PasswordReset).count()==0


def test_failed_email_delivery_invalidates_challenge(client,db,providers,monkeypatch):
    from app import mailer
    monkeypatch.setattr(mailer,'send_reset_code',lambda *args:False)
    user=make(db,'deliveryfail')
    result=client.post('/api/auth/forgot-password',json={'email':user.email})
    assert result.status_code==200
    assert db.query(RecoveryRequest).one().used_at is not None
    assert db.query(PasswordReset).count()==0
