"""Start Wameed locally; reuse running services and stop only processes we started."""
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
URL = 'http://127.0.0.1:5173'
children = []
logs = []

def listening(port):
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=.3): return True
    except OSError: return False

def ready(url):
    try:
        with urllib.request.urlopen(url, timeout=1) as response: return response.status == 200
    except Exception: return False

def start(command, cwd, filename):
    folder = ROOT / 'work' / 'local-server'
    folder.mkdir(parents=True, exist_ok=True)
    log = (folder / filename).open('a')
    logs.append(log)
    children.append(subprocess.Popen(command, cwd=cwd, stdout=log, stderr=subprocess.STDOUT, start_new_session=True))

def stop(*_):
    raise KeyboardInterrupt

signal.signal(signal.SIGTERM, stop)
try:
    npm = shutil.which('npm')
    if not npm:
        for candidate in ('/opt/homebrew/bin/npm', '/usr/local/bin/npm'):
            if Path(candidate).is_file(): npm = candidate; break
    if not npm: raise RuntimeError('Node.js غير متوفر. ثبّت Node.js ثم أعد المحاولة.')
    os.environ['PATH'] = str(Path(npm).parent) + os.pathsep + os.environ.get('PATH', '')
    if not (ROOT/'frontend/node_modules/vite').is_dir(): raise RuntimeError('ملفات تشغيل الواجهة غير موجودة.')
    if not listening(5002): start([sys.executable, 'run_server.py'], ROOT/'backend', 'api.log')
    if not listening(5173): start([npm, 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], ROOT/'frontend', 'frontend.log')
    for _ in range(120):
        if any(p.poll() is not None for p in children): raise RuntimeError('تعذّر بدء المشروع. راجع ملفات التشغيل في work/local-server.')
        if ready(URL) and ready('http://127.0.0.1:5002/openapi.json'): break
        time.sleep(.25)
    else: raise RuntimeError('المشروع لم يجهز في الوقت المتوقع. راجع work/local-server.')
    print('\nوميض جاهز: '+URL+'\nاترك هذه النافذة مفتوحة أثناء الاستخدام.\nلإيقاف التشغيل اضغط Control + C.\n', flush=True)
    if os.environ.get('WAMEED_NO_BROWSER') != '1': subprocess.run(['open', URL], check=False)
    while children:
        if any(p.poll() is not None for p in children): raise RuntimeError('توقف أحد أجزاء المشروع. راجع work/local-server.')
        time.sleep(1)
except KeyboardInterrupt:
    print('\nتم إيقاف تشغيل وميض.', flush=True)
except Exception as exc:
    print(str(exc), file=sys.stderr, flush=True)
    sys.exitcode = 1
finally:
    for p in children:
        if p.poll() is None:
            try: os.killpg(p.pid, signal.SIGTERM)
            except ProcessLookupError: pass
    for p in children:
        try: p.wait(timeout=5)
        except subprocess.TimeoutExpired:
            try: os.killpg(p.pid, signal.SIGKILL)
            except ProcessLookupError: pass
    for log in logs: log.close()
if getattr(sys, 'exitcode', 0): sys.exit(sys.exitcode)
