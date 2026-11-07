"""Consistent SQLite backup without stopping the server; never copies an open DB file."""
import argparse,sqlite3,os
from datetime import datetime
from pathlib import Path
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=root/'backups')
args=parser.parse_args()
args.output.mkdir(parents=True,exist_ok=True)
output=args.output/f'wameed-{datetime.now():%Y%m%d-%H%M%S}.db'
with sqlite3.connect(f'file:{root / "app.db"}?mode=ro',uri=True) as source:
    with sqlite3.connect(output) as destination:
        source.backup(destination)
        if destination.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise RuntimeError('Backup verification failed')
os.chmod(output,0o600)
print(output)
