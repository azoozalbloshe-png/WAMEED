"""Optional Twilio Verify adapter. Never simulates successful delivery."""
import base64
import json
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from app.config import settings

class ProviderUnavailable(Exception):
    pass

def configured():
    return bool(settings.TWILIO_API_KEY and settings.TWILIO_API_SECRET and settings.TWILIO_VERIFY_SERVICE_SID)

def call(resource, payload, service_id=None):
    if not (settings.TWILIO_API_KEY and settings.TWILIO_API_SECRET and (service_id or settings.TWILIO_VERIFY_SERVICE_SID)):
        raise ProviderUnavailable('Phone verification requires a messaging provider.')
    auth = base64.b64encode(f'{settings.TWILIO_API_KEY}:{settings.TWILIO_API_SECRET}'.encode()).decode()
    request = Request(f'https://verify.twilio.com/v2/Services/{service_id or settings.TWILIO_VERIFY_SERVICE_SID}/{resource}', data=urlencode(payload).encode(), headers={'Authorization': f'Basic {auth}', 'Content-Type': 'application/x-www-form-urlencoded'})
    try:
        with urlopen(request, timeout=15) as response:
            return json.load(response)
    except HTTPError as exc:
        if resource == 'VerificationCheck' and exc.code in (400, 404, 429):
            return {'status': 'denied'}
        raise ProviderUnavailable('Unable to connect to the verification provider. Check its configuration and balance.') from None
    except (URLError, TimeoutError, ValueError):
        raise ProviderUnavailable('Unable to connect to the verification provider.') from None

def send(phone):
    return call('Verifications', {'To':phone, 'Channel':'sms'}).get('status') == 'pending'

def check(phone, code):
    return call('VerificationCheck', {'To':phone, 'Code':code}).get('status') == 'approved'


def recovery_configured(channel):
    enabled = settings.RECOVERY_SMS_ENABLED if channel == 'sms' else settings.RECOVERY_WHATSAPP_ENABLED if channel == 'whatsapp' else False
    return bool(enabled and settings.TWILIO_API_KEY and settings.TWILIO_API_SECRET and settings.TWILIO_RECOVERY_SERVICE_SID and settings.TWILIO_RECOVERY_SERVICE_SID != settings.TWILIO_VERIFY_SERVICE_SID)

def send_recovery(phone, channel):
    if not recovery_configured(channel):
        raise ProviderUnavailable('Phone account recovery is not configured.')
    return call('Verifications', {'To': phone, 'Channel': channel}, service_id=settings.TWILIO_RECOVERY_SERVICE_SID).get('status') == 'pending'

def check_recovery(phone, code):
    return call('VerificationCheck', {'To': phone, 'Code': code}, service_id=settings.TWILIO_RECOVERY_SERVICE_SID).get('status') == 'approved'
