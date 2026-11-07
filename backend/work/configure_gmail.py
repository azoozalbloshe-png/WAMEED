"""Interactive local credential entry. Password is never echoed or logged."""
import getpass
import os
import smtplib
import ssl
import certifi
from pathlib import Path
from dotenv import dotenv_values, set_key

root = Path(__file__).resolve().parents[1]
path = root / '.env'
config = dotenv_values(path)
print('Wameed email setup')
print('Paste the Google APP PASSWORD below, then press Enter.')
print('The password will stay hidden while you type or paste.')
password = ''.join(getpass.getpass('App password: ').split())
if len(password) != 16 or not password.isascii() or not password.isalnum():
    raise SystemExit('Expected the 16-character Google app password. Nothing was saved.')
username = config.get('SMTP_USERNAME')
if not username:
    raise SystemExit('SMTP account is missing. Nothing was saved.')
try:
    with smtplib.SMTP('smtp.gmail.com', 587, timeout=20) as smtp:
        smtp.starttls(context=ssl.create_default_context(cafile=certifi.where()))
        smtp.login(username, password)
except (OSError, smtplib.SMTPException):
    raise SystemExit('Google did not accept the connection. Check the app password and try again. Nothing was saved.')
os.chmod(path, 0o600)
set_key(str(path), 'SMTP_PASSWORD', password, quote_mode='always')
os.chmod(path, 0o600)
password = None
print('SUCCESS: Google accepted the connection. App password saved locally.')
print('Return to the chat and say: saved')
