"""Bound upload requests before parsing and apply private API response headers."""
from starlette.responses import JSONResponse

class BodyTooLarge(Exception): pass

class RequestLimits:
    def __init__(self,app):self.app=app
    async def __call__(self,scope,receive,send):
        if scope['type']!='http':return await self.app(scope,receive,send)
        limit=6*1024*1024
        headers=dict(scope.get('headers',[]))
        try:length=int(headers.get(b'content-length',b'0'))
        except ValueError:length=0
        if length>limit:
            return await JSONResponse({'detail':'Request exceeds the 6 MB size limit.'},status_code=413)(scope,receive,send)
        size=0
        async def bounded():
            nonlocal size
            message=await receive()
            size+=len(message.get('body',b''))
            if size>limit:raise BodyTooLarge()
            return message
        async def secure_send(message):
            if message['type']=='http.response.start':
                response_headers=list(message.get('headers',[]))
                response_headers.extend([(b'x-content-type-options',b'nosniff'),(b'x-frame-options',b'DENY'),(b'cache-control',b'no-store'),(b'referrer-policy',b'no-referrer')])
                message['headers']=response_headers
            await send(message)
        try:await self.app(scope,bounded,secure_send)
        except BodyTooLarge:
            await JSONResponse({'detail':'Request exceeds the 6 MB size limit.'},status_code=413)(scope,receive,secure_send)


def limit_auth(db, request, identity, action):
    import hashlib,hmac
    from datetime import datetime,timedelta
    from fastapi import HTTPException
    from app.config import settings
    from app.models.operations import AuthAttempt
    def fingerprint(value):return hmac.new(settings.SECRET_KEY.encode(),value.encode(),hashlib.sha256).hexdigest()
    now=datetime.utcnow();since=now-timedelta(minutes=15)
    who=fingerprint(action+':'+identity.strip().casefold())
    client=fingerprint(request.client.host if request.client else 'unknown')
    db.query(AuthAttempt).filter(AuthAttempt.created_at<now-timedelta(days=1)).delete(synchronize_session=False)
    same=db.query(AuthAttempt).filter(AuthAttempt.identity_hash==who,AuthAttempt.created_at>=since).count()
    address=db.query(AuthAttempt).filter(AuthAttempt.client_hash==client,AuthAttempt.action==action,AuthAttempt.created_at>=since).count()
    if same>=20 or address>=(10 if action=='register' else 120):
        raise HTTPException(429,'Too many requests. Wait 15 minutes before trying again.')
    db.add(AuthAttempt(identity_hash=who,client_hash=client,action=action,created_at=now));db.commit()
