"""SMTP delivery; configuration is read from the same settings/.env as the API."""
import smtplib
import ssl
import certifi
from email.message import EmailMessage
from urllib.parse import quote
from app.config import settings

def configured():
    return bool(settings.SMTP_HOST and settings.SMTP_FROM and settings.SMTP_SECURITY in ("starttls", "ssl") and (not settings.SMTP_USERNAME or settings.SMTP_PASSWORD))

def send_message(email, subject, body):
    if not configured():
        return False
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
