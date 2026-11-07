import sqlite3
import tempfile
from pathlib import Path
from sqlalchemy import create_engine
import app.main as main
source=Path('app.db')
with tempfile.TemporaryDirectory() as directory:
    path=Path(directory)/'migration.db'
    original=sqlite3.connect(source)
    cloned=sqlite3.connect(path)
    original.backup(cloned)
    tables=['users','properties','tenants','contracts','meters','meter_readings','rent_payments','property_expenses']
    before={t:cloned.execute(f'SELECT count(*) FROM {t}').fetchone()[0] for t in tables}
    cloned.close();original.close()
    main.engine=create_engine(f'sqlite:///{path}')
    main.migrate_additive_schema();main.migrate_additive_schema()
    c=sqlite3.connect(path)
    after={t:c.execute(f'SELECT count(*) FROM {t}').fetchone()[0] for t in tables}
    assert before==after
    for table in tables:
        assert c.execute(f'SELECT count(*) FROM {table} WHERE customer_account_id IS NULL').fetchone()[0]==0
    assert c.execute("SELECT count(*) FROM sqlite_master WHERE name IN ('password_resets','role_policies','audit_logs')").fetchone()[0]==3
    c.close()
    print('Migration twice: record counts preserved; all legacy records scoped; new tables ready.')
