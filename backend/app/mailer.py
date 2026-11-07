"""SMTP delivery; configuration is read from the same settings/.env as the API."""
import smtplib
import hashlib
import hmac
import json
import time
import secrets
import httpx
from urllib.parse import urlparse
import ssl
import certifi
from email.message import EmailMessage
from urllib.parse import quote
from app.config import settings

def configured():
    if settings.EMAIL_DELIVERY == 'google_script':
        url = urlparse(settings.GOOGLE_MAIL_URL)
        return bool(url.scheme == 'https' and url.hostname == 'script.google.com' and url.path.endswith('/exec') and len(settings.GOOGLE_MAIL_SECRET) >= 32)
    if settings.EMAIL_DELIVERY != 'smtp': return False
    return bool(settings.SMTP_HOST and settings.SMTP_FROM and settings.SMTP_SECURITY in ("starttls", "ssl") and (not settings.SMTP_USERNAME or settings.SMTP_PASSWORD))

def send_message(email, subject, body):
    if not configured():
        return False
    if settings.EMAIL_DELIVERY == 'google_script':
        return send_google_message(email, subject, body)
    message = EmailMessage()
    message['Subject'] = subject
    message['From'] = settings.SMTP_FROM
    message['To'] = email
    message.set_content(body)
    try:
        context = ssl.create_default_context(cafile=certifi.where())
        if settings.SMTP_SECURITY == 'ssl':
            connection = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15, context=context)
        elif settings.SMTP_SECURITY == 'starttls':
            connection = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
        else:
            return False
        with connection as smtp:
            if settings.SMTP_SECURITY == 'starttls':
                smtp.starttls(context=context)
            if settings.SMTP_USERNAME:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)
        return True
    except (OSError, smtplib.SMTPException, ValueError):
        return False

def send_reset_link(email, token):
    return send_message(email, 'WAMEED — Reset password', f'{settings.FRONTEND_URL}/reset-password?token={quote(token)}')

def send_verification_link(email, token):
    return send_message(email, 'WAMEED — Verify email', f'{settings.FRONTEND_URL}/verify-email?token={quote(token)}')


def send_reset_code(email, code):
    return send_message(
        email,
        'وميض | WAMEED — رمز استعادة كلمة المرور',
        f'رمز استعادة كلمة المرور في وميض: {code}\n'
        'صالح لمدة 10 دقائق ولمرة واحدة. لا تشارك الرمز مع أي شخص.\n'
        'إذا لم تطلب تغيير كلمة المرور، تجاهل هذه الرسالة.\n\n'
        f'Your WAMEED password recovery code: {code}\n'
        'Valid for 10 minutes and one use. Do not share this code.\n'
        'If you did not request this, ignore this email.'
    )


def send_google_message(email, subject, body):
    payload = json.dumps({'to':email, 'subject':subject, 'body':body, 'timestamp':int(time.time()), 'nonce':secrets.token_hex(16)}, ensure_ascii=False, separators=(',', ':'))
    signature = hmac.new(settings.GOOGLE_MAIL_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    try:
        with httpx.Client(timeout=20, follow_redirects=False) as client:
            response = client.post(settings.GOOGLE_MAIL_URL, json={'payload':payload, 'signature':signature})
            if response.status_code in (302, 303):
                location = response.headers.get('location', '')
                target = urlparse(location)
                if target.scheme != 'https' or target.hostname != 'script.googleusercontent.com': return False
                response = client.get(location)
            response.raise_for_status()
            return response.json().get('ok') is True
    except (httpx.HTTPError, ValueError, TypeError, AttributeError):
        return False
