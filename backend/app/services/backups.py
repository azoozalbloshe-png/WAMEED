"""Private, verified SQLite snapshots and account-scoped business-data recovery.
Authentication, subscriptions, permissions and other customers are never restored.
"""
import base64
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import hmac
import io
import json
import logging
import os
from pathlib import Path
import re
import sqlite3
import threading
import time
import uuid
import zipfile
from fastapi import HTTPException
from sqlalchemy import select, delete, insert
from sqlalchemy.exc import SQLAlchemyError
from app.config import settings
from app.database import Base
from app.models.user import CustomerAccount, AuditLog
from app.models.real_estate import Property, Tenant, Contract, Meter, MeterReading, RentPayment, PropertyExpense
from app.models.operations import Unit, MaintenanceRequest, Attachment

MODELS = (Property, Unit, Tenant, Contract, Meter, MeterReading, RentPayment, PropertyExpense, MaintenanceRequest, Attachment)
TABLES = tuple(m.__table__ for m in MODELS)
NAMES = {t.name for t in TABLES}
ID_PATTERN = re.compile(r'^wameed-\d{8}T\d{6}Z-[a-f0-9]{12}$')
log = logging.getLogger(__name__)


def now(): return datetime.now(timezone.utc)
def json_bytes(value): return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), default=encode).encode()
def encode(value):
    if isinstance(value, bytes): return {'base64': base64.b64encode(value).decode()}
    if isinstance(value, datetime): return value.isoformat()
    if hasattr(value, 'value'): return value.value
    raise TypeError(type(value).__name__)

def private_dir():
    folder = Path(settings.BACKUP_DIR).expanduser().resolve()
    folder.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(folder, 0o700)
    return folder

@contextmanager
def file_lock():
    path = private_dir()/'.backup.lock'
    fd = os.open(path, os.O_CREAT | os.O_RDWR, 0o600)
    with os.fdopen(fd, 'a') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        try: yield
        finally: fcntl.flock(handle, fcntl.LOCK_UN)

def checksum(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024*1024), b''): h.update(block)
    return h.hexdigest()

def create_snapshot(engine, reason='automatic', retain=True, only_if_due=False):
    if engine.dialect.name != 'sqlite': raise HTTPException(503, 'Automatic backups require the configured SQLite database.')
    with file_lock():
        folder = private_dir()
        if only_if_due:
            latest=next((r for r in list_snapshots() if r['reason'] in ('automatic','manual')),None)
            if latest and (now()-datetime.fromisoformat(latest['created_at'])).total_seconds()<settings.BACKUP_INTERVAL_HOURS*3600:return latest
        id = f'wameed-{now():%Y%m%dT%H%M%SZ}-{uuid.uuid4().hex[:12]}'
        temp = folder/(id+'.partial')
        final = folder/(id+'.sqlite')
        fd = os.open(temp, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600);os.close(fd)
        try:
            source = engine.raw_connection()
            try:
                with sqlite3.connect(temp) as destination:
                    source.driver_connection.backup(destination, pages=256, sleep=.01)
                    if destination.execute('PRAGMA integrity_check').fetchone()[0] != 'ok': raise RuntimeError('Snapshot integrity check failed')
            finally: source.close()
            with temp.open('rb') as stream: os.fsync(stream.fileno())
            temp.replace(final)
            metadata = {'id': id, 'created_at': now().isoformat(), 'reason': reason, 'size': final.stat().st_size, 'sha256': checksum(final), 'verified': True}
            manifest = folder/(id+'.json')
            fd = os.open(manifest, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            with os.fdopen(fd, 'wb') as stream: stream.write(json_bytes(metadata));stream.flush();os.fsync(stream.fileno())
            if retain: prune(folder)
            return metadata
        except Exception:
            temp.unlink(missing_ok=True)
            # A file without a complete manifest is never offered for recovery.
            if not (folder/(id+'.json')).exists(): final.unlink(missing_ok=True)
            raise

def list_snapshots():
    rows=[]
    for file in private_dir().glob('wameed-*.json'):
        if not ID_PATTERN.fullmatch(file.stem): continue
        try:
            meta=json.loads(file.read_text())
            if meta['id']==file.stem and (file.with_suffix('.sqlite')).is_file():rows.append(meta)
        except (ValueError,KeyError,OSError):continue
    return sorted(rows,key=lambda r:r['created_at'],reverse=True)

def prune(folder):
    rows=list_snapshots()
    # Keep the last 30 normal snapshots plus 30 independent recovery safeguards.
    for safety in (False,True):
        group=[r for r in rows if (r['reason']=='before_restore')==safety]
        for row in group[settings.BACKUP_RETENTION_COUNT:]:
            (folder/(row['id']+'.json')).unlink(missing_ok=True)
            (folder/(row['id']+'.sqlite')).unlink(missing_ok=True)

def read_snapshot(id):
    if not ID_PATTERN.fullmatch(id):raise HTTPException(404,'Backup not found.')
    folder=private_dir();path=folder/(id+'.sqlite')
    try:meta=json.loads((folder/(id+'.json')).read_text())
    except (OSError,ValueError):raise HTTPException(404,'Backup not found.')
    if not path.is_file():raise HTTPException(404,'Backup not found.')
    if checksum(path)!=meta.get('sha256'):raise HTTPException(409,'Backup verification failed. No data was changed.')
    return path,meta

def consistent_read(db):
    connection=db.connection()
    if connection.dialect.name=='sqlite' and not connection.connection.driver_connection.in_transaction:
        connection.exec_driver_sql('BEGIN')
    return connection

def account_data(connection, account_id):
    return {t.name:[dict(r) for r in connection.execute(select(t).where(t.c.customer_account_id==account_id).order_by(t.c.id)).mappings()] for t in TABLES}

def snapshot_data(id, account_id):
    path,meta=read_snapshot(id)
    with sqlite3.connect(f'{path.as_uri()}?mode=ro',uri=True) as conn:
        conn.row_factory=sqlite3.Row
        if conn.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise HTTPException(409,'Backup verification failed. No data was changed.')
        if not conn.execute('SELECT id FROM customer_accounts WHERE id=?',(account_id,)).fetchone():raise HTTPException(404,'This account did not exist in the selected backup.')
        result={}
        for table in TABLES:
            columns={r['name'] for r in conn.execute(f'PRAGMA table_info("{table.name}")')}
            if columns!={c.name for c in table.columns}:raise HTTPException(409,'This backup uses a different data format. Contact administration.')
            result[table.name]=[dict(r) for r in conn.execute(f'SELECT * FROM "{table.name}" WHERE customer_account_id=? ORDER BY id',(account_id,))]
    validate_links(result,account_id)
    return result,meta

def validate_links(data,account_id):
    ids={name:{r['id'] for r in rows} for name,rows in data.items()}
    for table in TABLES:
        for row in data[table.name]:
            if row['customer_account_id']!=account_id:raise HTTPException(409,'Backup contains invalid linked records.')
            for column in table.columns:
                for fk in column.foreign_keys:
                    target=fk.column.table.name
                    if target in NAMES and row[column.name] is not None and row[column.name] not in ids[target]:raise HTTPException(409,'Backup contains invalid linked records.')
            if table.name=='record_attachments':
                target={'properties':'properties','expenses':'property_expenses','maintenance':'maintenance_requests'}.get(row['resource'])
                if not target or row['record_id'] not in ids[target]:raise HTTPException(409,'Backup contains invalid linked records.')

def state_hash(connection,account_id):
    data=account_data(connection,account_id)
    # Include audit progress to invalidate a successful restore preview even for identical data.
    audit=connection.execute(select(AuditLog.id).where(AuditLog.customer_account_id==account_id).order_by(AuditLog.id.desc()).limit(1)).scalar()
    return hashlib.sha256(json_bytes({'records':data,'audit':audit})).hexdigest(),data

def sign_preview(payload):
    body=base64.urlsafe_b64encode(json_bytes(payload)).rstrip(b'=')
    signature=hmac.new(settings.SECRET_KEY.encode(),body,hashlib.sha256).hexdigest()
    return body.decode()+'.'+signature

def verify_preview(token):
    try:
        body,signature=token.rsplit('.',1)
        expected=hmac.new(settings.SECRET_KEY.encode(),body.encode(),hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected,signature):raise ValueError()
        payload=json.loads(base64.urlsafe_b64decode(body+'='*(-len(body)%4)))
        if payload['expires']<time.time():raise ValueError()
        return payload
    except (ValueError,KeyError,TypeError):raise HTTPException(409,'The restore preview expired. Preview the backup again.')

def counts(data):return {name:len(rows) for name,rows in data.items()}

def preview_restore(db,id,account_id,actor):
    account=db.get(CustomerAccount,account_id)
    if not account:raise HTTPException(404,'Account not found.')
    saved,meta=snapshot_data(id,account_id)
    fingerprint,current=state_hash(consistent_read(db),account_id)
    token=sign_preview({'backup':id,'sha256':meta['sha256'],'account':account_id,'actor':actor.id,'state':fingerprint,'name':account.name,'expires':time.time()+600})
    return {'token':token,'account_id':account_id,'account_name':account.name,'backup_at':meta['created_at'],'current':counts(current),'saved':counts(saved)}

def convert_rows(table,rows):
    result=[]
    for original in rows:
        row=dict(original)
        for column in table.columns:
            if row[column.name] is not None and column.type.python_type is datetime:row[column.name]=datetime.fromisoformat(row[column.name])
        result.append(row)
    return result

def restore_account(db,id,account_id,actor,token,confirmation):
    payload=verify_preview(token)
    if (payload['backup'],payload['account'],payload['actor'])!=(id,account_id,actor.id):raise HTTPException(409,'The restore preview does not match this account or backup.')
    account=db.get(CustomerAccount,account_id)
    if not account or account.name!=confirmation or payload['name']!=confirmation:raise HTTPException(422,'Type the exact customer account name to confirm recovery.')
    saved,meta=snapshot_data(id,account_id)
    if meta['sha256']!=payload['sha256']:raise HTTPException(409,'Backup verification failed. No data was changed.')
    engine=db.get_bind()
    # End the read-only preview transaction before taking a consistent safety snapshot.
    actor_id=actor.id
    db.rollback()
    safety=create_snapshot(engine,'before_restore')
    connection=engine.connect()
    try:
        connection.exec_driver_sql('BEGIN IMMEDIATE')
        fingerprint,current=state_hash(connection,account_id)
        if fingerprint!=payload['state']:raise HTTPException(409,'Account data changed after preview. Preview the backup again.')
        validate_links(current,account_id)
        for table in TABLES:
            ids=[r['id'] for r in saved[table.name]]
            if ids and connection.execute(select(table.c.id).where(table.c.id.in_(ids),table.c.customer_account_id.is_distinct_from(account_id))).first():raise HTTPException(409,'Recovery conflicts with another account. No data was changed.')
            # Incoming links from another account must never be affected by replacement.
            current_ids=[r['id'] for r in current[table.name]]
            for source in TABLES:
                for column in source.columns:
                    if current_ids and any(fk.column.table.name==table.name for fk in column.foreign_keys):
                        if connection.execute(select(source.c.id).where(column.in_(current_ids),source.c.customer_account_id.is_distinct_from(account_id))).first():raise HTTPException(409,'Recovery conflicts with another account. No data was changed.')
        for table in reversed(TABLES):connection.execute(delete(table).where(table.c.customer_account_id==account_id))
        for table in TABLES:
            if saved[table.name]:connection.execute(insert(table),convert_rows(table,saved[table.name]))
        connection.execute(insert(AuditLog.__table__).values(actor_user_id=actor_id,customer_account_id=account_id,action='backup.restore',target_type='customer_account',target_id=str(account_id),details=json.dumps({'backup':id,'safety_backup':safety['id']})))
        connection.commit()
        return {'restored':counts(saved),'safety_backup':safety['id']}
    except HTTPException:
        connection.rollback();raise
    except (SQLAlchemyError,ValueError,TypeError):
        connection.rollback();log.exception('Account restore rolled back')
        raise HTTPException(409,'Recovery could not be completed. No data was changed.')
    finally:connection.close();db.expire_all()

def export_account(db,account):
    data=account_data(consistent_read(db),account.id)
    stream=io.BytesIO()
    with zipfile.ZipFile(stream,'w',compression=zipfile.ZIP_DEFLATED) as archive:
        for row in data['record_attachments']:
            content=row.pop('content')
            row['file']=f'attachments/{row["id"]}'
            archive.writestr(row['file'],content)
        archive.writestr('data.json',json_bytes({'format':'wameed-account-export','version':1,'exported_at':now().isoformat(),'account':{'id':account.id,'name':account.name},'records':data}))
        archive.writestr('README.txt','وميض — تصدير بيانات الحساب\nيشمل السجلات الحالية والمؤرشفة والمرفقات. لا يشمل كلمات المرور أو إعدادات الدخول.\nالاسترجاع عن طريق إدارة وميض باستخدام النسخ الاحتياطية المعتمدة. احتفظ بهذا الملف في مكان خاص.\n\nWAMEED account data export\nIncludes active and archived business records and attachments. No credentials or login settings.\nRecovery is handled by administration from managed backups. Keep this file private.\n')
    return stream.getvalue()

class BackupWorker:
    def __init__(self,engine):self.engine=engine;self.stop=threading.Event();self.thread=None;self.error=None;self.checked_id=None
    def tick(self):
        if self.engine.dialect.name!='sqlite':self.error='unsupported_database';return
        latest=next((r for r in list_snapshots() if r['reason'] in ('automatic','manual')),None)
        if latest and latest['id']!=self.checked_id:
            try:read_snapshot(latest['id'])
            except HTTPException:
                log.warning('Latest snapshot failed verification; creating a replacement')
                latest=create_snapshot(self.engine)
            self.checked_id=latest['id']
        saved=create_snapshot(self.engine, only_if_due=True)
        self.checked_id=saved['id']
        self.error=None
    def run(self):
        while not self.stop.is_set():
            try:self.tick()
            except Exception:self.error='backup_failed';log.exception('Automatic backup failed; retrying in one minute')
            self.stop.wait(60)
    def start(self):
        if settings.BACKUP_ENABLED:
            self.thread=threading.Thread(target=self.run,name='wameed-backups',daemon=True);self.thread.start()
    def close(self):
        self.stop.set()
        if self.thread:self.thread.join(timeout=5)
