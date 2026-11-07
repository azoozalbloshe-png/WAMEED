import ssl

import certifi
import pytest

from app import mailer


@pytest.mark.parametrize('security,port', [('starttls', 587), ('ssl', 465)])
def test_smtp_uses_trusted_certificates(monkeypatch, security, port):
    monkeypatch.setattr(mailer.settings, 'SMTP_HOST', 'smtp.example.com')
    monkeypatch.setattr(mailer.settings, 'SMTP_FROM', 'sender@example.com')
    monkeypatch.setattr(mailer.settings, 'SMTP_USERNAME', 'sender@example.com')
    monkeypatch.setattr(mailer.settings, 'SMTP_PASSWORD', 'test-password')
    monkeypatch.setattr(mailer.settings, 'SMTP_SECURITY', security)
    monkeypatch.setattr(mailer.settings, 'SMTP_PORT', port)
    contexts = []
    delivered = []
    create_context = ssl.create_default_context

    def trusted_context(*args, **kwargs):
        assert kwargs['cafile'] == certifi.where()
        context = create_context(*args, **kwargs)
        assert context.verify_mode == ssl.CERT_REQUIRED
        assert context.check_hostname
        return context

    class SMTP:
        def __init__(self, host, selected_port, **kwargs):
            assert host == 'smtp.example.com' and selected_port == port
            if 'context' in kwargs:
                contexts.append(kwargs['context'])

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def starttls(self, context):
            contexts.append(context)

        def login(self, username, password):
            assert username == 'sender@example.com' and password == 'test-password'

        def send_message(self, message):
            delivered.append(message)

    monkeypatch.setattr(mailer.ssl, 'create_default_context', trusted_context)
    monkeypatch.setattr(mailer.smtplib, 'SMTP', SMTP)
    monkeypatch.setattr(mailer.smtplib, 'SMTP_SSL', SMTP)
    assert mailer.send_reset_link('recipient@example.com', 'test-token')
    assert len(contexts) == len(delivered) == 1
    assert delivered[0]['To'] == 'recipient@example.com'
