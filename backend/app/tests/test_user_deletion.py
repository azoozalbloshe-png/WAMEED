from datetime import datetime,timedelta
from app.models.user import User,CustomerAccount,AuditLog,PasswordReset,VerificationChallenge
from app.models.real_estate import Property
from app.tests.test_saas import make,headers

def test_delete_empty_legacy_owner_and_revoke_session(client,db):
    root=make(db,'deleteroot','super_admin');old=make(db,'olduser','user')
    uid=old.id;aid=old.customer_account_id
    root_h=headers(client,'deleteroot');old_h=headers(client,'olduser')
    db.add(PasswordReset(user_id=uid,token_hash='a'*64,expires_at=datetime.utcnow()+timedelta(minutes=15)))
    db.add(VerificationChallenge(user_id=uid,channel='email',destination=old.email,token_hash='b'*64,expires_at=datetime.utcnow()+timedelta(minutes=15)))
    db.add(AuditLog(actor_user_id=uid,customer_account_id=aid,action='historic.action'))
    db.commit()
    listing=client.get('/api/admin/users',headers=root_h).json()
    assert next(u for u in listing if u['id']==uid)['can_delete'] is True
    assert client.get(f'/api/admin/users/{uid}',headers=root_h).json()['can_delete'] is True
    assert client.delete(f'/api/admin/users/{uid}',headers=root_h).status_code==204
    assert db.get(User,uid) is None
    assert db.get(CustomerAccount,aid) is None
    assert db.query(PasswordReset).filter_by(user_id=uid).count()==0
    assert db.query(VerificationChallenge).filter_by(user_id=uid).count()==0
    historic=db.query(AuditLog).filter_by(action='historic.action').one()
    assert historic.actor_user_id is None and historic.customer_account_id is None
    assert db.query(AuditLog).filter_by(action='user.delete',target_id=str(uid)).count()==1
    assert client.get('/api/auth/me',headers=old_h).status_code==401
    assert client.delete(f'/api/admin/users/{uid}',headers=root_h).status_code==404
    # Reusing an email must never restore a deleted account's old sessions.
    make(db,'olduser','user')
    assert client.get('/api/auth/me',headers=old_h).status_code==401

def test_deletion_protects_developer_and_owner_data(client,db):
    root=make(db,'protectedroot','super_admin');owner=make(db,'dataowner')
    db.add(Property(name='Keep property',property_type='apartment',customer_account_id=owner.customer_account_id));db.commit()
    root_h=headers(client,'protectedroot');owner_h=headers(client,'dataowner')
    assert client.delete(f'/api/admin/users/{root.id}',headers=root_h).status_code==403
    assert client.delete(f'/api/admin/users/{owner.id}',headers=owner_h).status_code==403
    assert client.delete(f'/api/admin/users/{owner.id}').status_code==401
    r=client.delete(f'/api/admin/users/{owner.id}',headers=root_h)
    assert r.status_code==409
    assert db.get(User,owner.id) is not None and db.query(Property).count()==1
    listing=client.get('/api/admin/users',headers=root_h).json()
    assert all(not u['can_delete'] and u['deletion_reason'] for u in listing)

def test_owner_with_members_protected_but_member_can_be_deleted(client,db):
    make(db,'teamroot','super_admin');owner=make(db,'teamowner');member=make(db,'teammember','employee')
    # Move a user into the owner's team (retaining its unrelated empty workspace).
    member.customer_account_id=owner.customer_account_id
    own_empty=db.query(CustomerAccount).filter_by(owner_user_id=member.id).one()
    own_empty.owner_user_id=None
    db.commit()
    h=headers(client,'teamroot')
    assert client.delete(f'/api/admin/users/{owner.id}',headers=h).status_code==409
    assert client.delete(f'/api/admin/users/{member.id}',headers=h).status_code==204
    assert db.get(User,owner.id) is not None
    assert db.get(CustomerAccount,owner.customer_account_id) is not None
