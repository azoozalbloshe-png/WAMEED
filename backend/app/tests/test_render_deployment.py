import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import sys
from app import mailer
from app.database import database_url


def test_postgres_urls_select_installed_driver_and_preserve_tls():
    for scheme in ('postgres', 'postgresql'):
        url=database_url(f'{scheme}://user:secret@host/db?sslmode=require')
        assert url.drivername=='postgresql+psycopg' and url.query['sslmode']=='require'
    assert database_url('sqlite:///./app.db').drivername=='sqlite'


def test_google_mail_is_signed_and_follows_only_google_content_redirect(monkeypatch):
    monkeypatch.setattr(mailer.settings,'EMAIL_DELIVERY','google_script')
    monkeypatch.setattr(mailer.settings,'GOOGLE_MAIL_URL','https://script.google.com/macros/s/test/exec')
    monkeypatch.setattr(mailer.settings,'GOOGLE_MAIL_SECRET','test-secret-'*4)
    delivered=[]
    class Response:
        status_code=302
        headers={'location':'https://script.googleusercontent.com/macros/echo?test=1'}
        def raise_for_status(self): pass
        def json(self): return {'ok':True}
    class Client:
        def __init__(self,**kw): assert kw['follow_redirects'] is False
        def __enter__(self): return self
        def __exit__(self,*args): pass
        def post(self,url,json):
            assert url==mailer.settings.GOOGLE_MAIL_URL
            delivered.append(json)
            return Response()
        def get(self,url):
            assert url.startswith('https://script.googleusercontent.com/')
            return Response()
    monkeypatch.setattr(mailer.httpx,'Client',Client)
    assert mailer.configured() and mailer.send_reset_code('recipient@example.com','123456')
    envelope=delivered[0]
    expected=hmac.new(mailer.settings.GOOGLE_MAIL_SECRET.encode(),envelope['payload'].encode(),hashlib.sha256).hexdigest()
    assert hmac.compare_digest(expected,envelope['signature'])
    payload=json.loads(envelope['payload'])
    assert payload['to']=='recipient@example.com' and '123456' in payload['body']
    Response.headers={'location':'https://attacker.example/collect'}
    assert mailer.send_reset_code('recipient@example.com','123456') is False
    monkeypatch.setattr(mailer.settings,'GOOGLE_MAIL_URL','http://script.google.com/macros/s/test/exec')
    assert mailer.configured() is False


def test_same_origin_spa_serves_deep_links_but_keeps_api_404(tmp_path):
    dist=tmp_path/'dist';(dist/'assets').mkdir(parents=True)
    (dist/'index.html').write_text('<html>Wameed test</html>')
    (dist/'assets'/'app.js').write_text('/*asset*/')
    (dist/'wameed.svg').write_text('<svg/>')
    env={**os.environ,'FRONTEND_DIST_DIR':str(dist),'DATABASE_URL':f'sqlite:///{tmp_path}/app.db','SECRET_KEY':'isolated-render-test-secret','BACKUP_ENABLED':'false'}
    source='''
from fastapi.testclient import TestClient
from app.main import app
with TestClient(app) as client:
    assert client.get('/').text=='<html>Wameed test</html>'
    assert client.get('/contracts/123').text=='<html>Wameed test</html>'
    assert client.get('/assets/app.js').text=='/*asset*/'
    assert client.get('/wameed.svg').text=='<svg/>'
    assert client.get('/api/missing').status_code==404
    assert client.get('/assets/missing.js').status_code==404
    assert client.get('/api/health').json()['status']=='healthy'
print('SPA deployment checks passed')
'''
    result=subprocess.run([sys.executable,'-c',source],cwd=Path(__file__).resolve().parents[2],env=env,capture_output=True,text=True)
    assert result.returncode==0,result.stdout+result.stderr
