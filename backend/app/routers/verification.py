import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.user import VerificationChallenge, User, AuditLog
from app.routers.auth import get_current_active_user
from app import mailer, phone_provider

router = APIRouter(prefix='/api/verification')

class Phone(BaseModel):
    phone: str = Field(pattern=r'^\+[1-9]\d{7,14}$')

class Code(BaseModel):
    code: str = Field(pattern=r'^\d{4,10}$')

class Token(BaseModel):
    token: str = Field(min_length=20, max_length=200)

def cooldown(db, user, channel):
    now = datetime.utcnow()
    query = db.query(VerificationChallenge).filter(VerificationChallenge.user_id == user.id, VerificationChallenge.channel == channel)
    recent = query.order_by(VerificationChallenge.id.desc()).first()
    if recent and recent.created_at > now - timedelta(seconds=60):
        raise HTTPException(429, 'Wait one minute before requesting another code.')
    if query.filter(VerificationChallenge.created_at > now - timedelta(hours=1)).count() >= 5:
        raise HTTPException(429, 'Request limit reached. Try again in one hour.')
    query.filter(VerificationChallenge.used_at.is_(None)).update({'used_at': now})

@router.get('/status')
def status(user=Depends(get_current_active_user)):
    return {'email': user.email, 'phone': user.phone, 'email_verified': user.email_verified_at is not None, 'phone_verified': user.phone_verified_at is not None, 'email_available': mailer.configured(), 'phone_available': phone_provider.configured()}

@router.post('/email/send')
def send_email(db=Depends(get_db), user=Depends(get_current_active_user)):
    if not mailer.configured():
        raise HTTPException(503, 'Email delivery is not configured. Contact the platform administrator.')
    if user.email_verified_at:
        return {'message':'Email is already verified.'}
    cooldown(db, user, 'email')
    token = secrets.token_urlsafe(32)
    entry = VerificationChallenge(user_id=user.id, channel='email', destination=user.email, token_hash=hashlib.sha256(token.encode()).hexdigest(), expires_at=datetime.utcnow()+timedelta(minutes=15))
    db.add(entry)
    db.commit()
    if not mailer.send_verification_link(user.email, token):
        entry.used_at=datetime.utcnow();db.commit()
        raise HTTPException(503, 'Unable to send verification email. Check the email service.')
    return {'message':'A verification link has been sent to your email.'}

@router.post('/email/confirm')
def confirm_email(data: Token, db=Depends(get_db)):
    now=datetime.utcnow()
    entry=db.query(VerificationChallenge).filter(VerificationChallenge.channel=='email', VerificationChallenge.token_hash==hashlib.sha256(data.token.encode()).hexdigest(), VerificationChallenge.used_at.is_(None), VerificationChallenge.expires_at>now).first()
    if not entry:
        raise HTTPException(400, 'This link is invalid or expired.')
    user=db.get(User,entry.user_id)
    if not user or not user.is_active or user.email!=entry.destination:
        raise HTTPException(400,'This link is no longer valid for this email.')
    count=db.query(VerificationChallenge).filter(VerificationChallenge.id==entry.id, VerificationChallenge.used_at.is_(None)).update({'used_at':now})
    if not count:
        db.rollback();raise HTTPException(400,'This link has already been used.')
    user.email_verified_at=now
    db.add(AuditLog(actor_user_id=user.id,action='email.verified',target_type='user',target_id=str(user.id)))
    db.commit()
    return {'message':'Email verified.'}

@router.post('/phone/send')
def send_phone(data: Phone, db=Depends(get_db), user=Depends(get_current_active_user)):
    if not phone_provider.configured():
        raise HTTPException(503,'Phone verification is not configured.')
    cooldown(db,user,'phone')
    entry=VerificationChallenge(user_id=user.id,channel='phone',destination=data.phone,expires_at=datetime.utcnow()+timedelta(minutes=10))
    db.add(entry);db.commit()
    try:
        sent=phone_provider.send(data.phone)
    except phone_provider.ProviderUnavailable as exc:
        entry.used_at=datetime.utcnow();db.commit()
        raise HTTPException(503,str(exc))
    if not sent:
        entry.used_at=datetime.utcnow();db.commit()
        raise HTTPException(503,'Unable to send the verification code.')
    return {'message':'Verification code sent.'}

@router.post('/phone/confirm')
def confirm_phone(data: Code, db=Depends(get_db), user=Depends(get_current_active_user)):
    now=datetime.utcnow()
    entry=db.query(VerificationChallenge).filter(VerificationChallenge.user_id==user.id, VerificationChallenge.channel=='phone', VerificationChallenge.used_at.is_(None), VerificationChallenge.expires_at>now).order_by(VerificationChallenge.id.desc()).first()
    if not entry or entry.attempts>=5:
        raise HTTPException(400,'The code expired or the attempt limit was reached. Request a new code.')
    count=db.query(VerificationChallenge).filter(VerificationChallenge.id==entry.id,VerificationChallenge.attempts<5,VerificationChallenge.used_at.is_(None)).update({'attempts':VerificationChallenge.attempts+1})
    db.commit()
    if not count:
        raise HTTPException(400,'Attempt limit reached')
    try:
        approved=phone_provider.check(entry.destination,data.code)
    except phone_provider.ProviderUnavailable as exc:
        raise HTTPException(503,str(exc))
    if not approved:
        raise HTTPException(400,'Verification code is invalid or expired.')
    count=db.query(VerificationChallenge).filter(VerificationChallenge.id==entry.id,VerificationChallenge.used_at.is_(None)).update({'used_at':now})
    if not count:
        db.rollback();raise HTTPException(400,'This code has already been used.')
    user.phone=entry.destination;user.phone_verified_at=now
    db.add(AuditLog(actor_user_id=user.id,action='phone.verified',target_type='user',target_id=str(user.id)))
    db.commit()
    return {'message':'Phone number verified.'}
