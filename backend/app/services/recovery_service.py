"""Public recovery: generic responses, verified phones, bounded one-use challenges."""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy import func
from app.config import settings
from app.models.user import User, RecoveryRequest, PasswordReset
from app.services.auth_service import AuthService
from app import mailer, phone_provider

GENERIC = 'If these details belong to an active account, recovery instructions will be sent using your chosen method. Phone recovery requires a previously verified number.'

def digest(value):
    return hmac.new(settings.SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()

def options():
    return {'email': mailer.configured(), 'sms': phone_provider.recovery_configured('sms'), 'whatsapp': phone_provider.recovery_configured('whatsapp')}

def start(db, data, client):
    now = datetime.utcnow()
    db.query(RecoveryRequest).filter(RecoveryRequest.created_at < now - timedelta(days=1)).delete()
    destination = str(data.email).strip().lower() if data.method == 'email' else data.phone
    destination_hash = digest(destination)
    client_hash = digest(client)
    # Rate limiting includes unknown destinations and spans SMS/WhatsApp to prevent channel hopping.
    recent = db.query(RecoveryRequest).filter(RecoveryRequest.destination_hash == destination_hash, RecoveryRequest.created_at > now - timedelta(hours=1))
    if recent.filter(RecoveryRequest.created_at > now - timedelta(seconds=60)).first() or recent.count() >= 5:
        raise HTTPException(429, 'Please wait before requesting another message. Maximum: 5 requests per hour.')
    if db.query(RecoveryRequest).filter(RecoveryRequest.client_hash == client_hash, RecoveryRequest.created_at > now - timedelta(hours=1)).count() >= 20:
        raise HTTPException(429, 'Too many requests from this device. Try again later.')
    if not options()[data.method]:
        raise HTTPException(503, 'This recovery method is unavailable. Try another method or contact administration.')
    if data.method == 'email':
        matches = db.query(User).filter(func.lower(User.email) == destination, User.is_active.is_(True)).limit(2).all()
    else:
        matches = db.query(User).filter(User.phone == destination, User.phone_verified_at.is_not(None), User.is_active.is_(True)).limit(2).all()
    # Ambiguous shared phone numbers cannot be used for recovery.
    user = matches[0] if len(matches) == 1 else None
    request_id = secrets.token_urlsafe(32)
    entry = RecoveryRequest(request_hash=digest(request_id), user_id=user.id if user else None, method=data.method, destination=destination, destination_hash=destination_hash, client_hash=client_hash, user_version=user.token_version if user else None, expires_at=now+timedelta(minutes=10))
    db.add(entry)
    db.commit()
    if user and data.method == 'email':
        service = AuthService(db)
        token = service.create_reset_token(user.email)
        service.save_reset_token(token, user.email)
        if not mailer.send_reset_link(user.email, token):
            db.query(PasswordReset).filter(PasswordReset.token_hash == hashlib.sha256(token.encode()).hexdigest()).update({'used_at': now})
            db.commit()
    elif user:
        try:
            sent = phone_provider.send_recovery(entry.destination, data.method)
        except phone_provider.ProviderUnavailable:
            sent = False
        if not sent:
            entry.used_at = now
            db.commit()
    # Identical shape for registered, unverified, ambiguous and unknown destinations.
    return {'message': GENERIC, 'request_id': request_id}

def confirm(db, data):
    now = datetime.utcnow()
    entry = db.query(RecoveryRequest).filter(RecoveryRequest.request_hash == digest(data.request_id), RecoveryRequest.method.in_(['sms', 'whatsapp']), RecoveryRequest.used_at.is_(None), RecoveryRequest.expires_at > now).first()
    invalid = 'The code is invalid or expired. Request a new code if needed.'
    if not entry or entry.attempts >= 5:
        raise HTTPException(400, invalid)
    total = db.query(func.coalesce(func.sum(RecoveryRequest.attempts), 0)).filter(RecoveryRequest.destination_hash == entry.destination_hash, RecoveryRequest.created_at > now-timedelta(hours=1)).scalar()
    if total >= 10:
        raise HTTPException(429, 'Verification attempt limit reached. Try again in one hour.')
    claimed = db.query(RecoveryRequest).filter(RecoveryRequest.id == entry.id, RecoveryRequest.attempts < 5, RecoveryRequest.used_at.is_(None)).update({'attempts': RecoveryRequest.attempts+1})
    db.commit()
    if not claimed:
        raise HTTPException(400, invalid)
    user = db.get(User, entry.user_id) if entry.user_id else None
    if not user or not user.is_active or not user.phone_verified_at or user.phone != entry.destination or user.token_version != entry.user_version:
        raise HTTPException(400, invalid)
    if not phone_provider.recovery_configured(entry.method):
        raise HTTPException(503, 'Verification service is currently unavailable.')
    try:
        approved = phone_provider.check_recovery(entry.destination, data.code)
    except phone_provider.ProviderUnavailable:
        raise HTTPException(503, 'Verification is unavailable right now. Try again later.')
    if not approved:
        raise HTTPException(400, invalid)
    # Consume the browser challenge and create the reset grant in one transaction.
    claimed = db.query(RecoveryRequest).filter(RecoveryRequest.id == entry.id, RecoveryRequest.used_at.is_(None)).update({'used_at': now})
    if not claimed:
        db.rollback()
        raise HTTPException(400, invalid)
    service = AuthService(db)
    token = service.create_reset_token(user.email)
    service.save_reset_token(token, user.email, commit=False, phone=entry.destination)
    db.commit()
    return {'reset_token': token}
