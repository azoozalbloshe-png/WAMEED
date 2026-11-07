from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.security import RequestLimits
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, real_estate, admin, verification, operations, record_lifecycle, backup_routes
from app.config import settings
from app.database import engine
from app.models.real_estate import RentPayment, PropertyExpense
from app.models.user import User, CustomerAccount, AuditLog
from app.models import real_estate as real_estate_models
from sqlalchemy import inspect, text

app = FastAPI(
    title="Wameed API",
    version=getattr(settings, "APP_VERSION", "1.0.0")
)

@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Omit submitted values: passwords, identifiers and non-finite numbers must
    # never be reflected into validation responses or break JSON serialization.
    return JSONResponse(status_code=422, content={"detail": [
        {"type": e["type"], "loc": list(e["loc"]), "msg": e["msg"]}
        for e in exc.errors()
    ]})

# تفعيل الـ CORS للسماح للواجهة الأمامية بالاتصال
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestLimits)

# تسجيل الـ Routers الخاصة بـ FastAPI
app.include_router(auth.auth_bp, prefix="/api/auth", tags=["Authentication"])
app.include_router(real_estate.router, tags=["Real Estate"])
app.include_router(operations.router, tags=["Operations"])
app.include_router(record_lifecycle.router, tags=["Record lifecycle"])
app.include_router(backup_routes.router, tags=["Backups"])
app.include_router(admin.router, tags=["Developer"])
app.include_router(verification.router, tags=["Verification"])


def migrate_additive_schema():
    """Add tenant metadata without rebuilding or deleting existing records."""
    # Import all model declarations before create_all; existing tables are kept.
    from app.database import Base
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    additions = {
        "users": {
            "full_name": "VARCHAR(150)", "phone": "VARCHAR(30)",
            "email_verified_at": "DATETIME", "phone_verified_at": "DATETIME",
            "customer_account_id": "INTEGER REFERENCES customer_accounts(id)",
            "last_login_at": "DATETIME", "failed_login_attempts": "INTEGER NOT NULL DEFAULT 0",
            "locked_until": "DATETIME", "token_version": "INTEGER NOT NULL DEFAULT 0",
        },
    }
    additions["password_resets"] = {"issued_email": "VARCHAR(254)", "issued_phone": "VARCHAR(30)", "user_version": "INTEGER"}
    additions["properties"] = {"archived_at": "DATETIME"}
    additions["contracts"] = {"unit_id": "INTEGER REFERENCES property_units(id)"}
    additions["property_expenses"] = {"unit_id": "INTEGER REFERENCES property_units(id)"}
    business_tables = ("properties", "tenants", "contracts", "meters", "meter_readings", "rent_payments", "property_expenses")
    for table in business_tables:
        if table in inspector.get_table_names():
            additions.setdefault(table, {})["customer_account_id"] = "INTEGER REFERENCES customer_accounts(id)"

    with engine.begin() as conn:
        for table, columns in additions.items():
            if table not in inspector.get_table_names():
                continue
            current = {column["name"] for column in inspect(engine).get_columns(table)}
            for name, sql_type in columns.items():
                if name not in current:
                    conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{name}" {sql_type}'))
        for table, suffix in (("contracts", "unit_id, start_date, end_date"), ("rent_payments", "paid_at"), ("property_expenses", "spent_at")):
            if table in inspector.get_table_names():
                conn.execute(text(f'CREATE INDEX IF NOT EXISTS "idx_{table}_account_dates" ON "{table}" (customer_account_id, {suffix})'))
        if "users" not in inspector.get_table_names():
            return

        # Give every existing login a private workspace. Legacy unowned business
        # records are retained in the developer's workspace because ownership
        # cannot be inferred from the old schema.
        users = conn.execute(text("SELECT id, username, is_superuser FROM users ORDER BY id")).mappings().all()
        for user in users:
            account_id = conn.execute(text("SELECT customer_account_id FROM users WHERE id=:id"), {"id": user["id"]}).scalar()
            if account_id is None:
                result = conn.execute(text("INSERT INTO customer_accounts(name, owner_user_id, status, subscription_tier) VALUES (:name,:owner,'active','basic')"), {"name": user["username"], "owner": user["id"]})
                conn.execute(text("UPDATE users SET customer_account_id=:account WHERE id=:id"), {"account": result.lastrowid, "id": user["id"]})

        owner = next((u for u in users if u["is_superuser"]), None)
        if owner:
            account_id = conn.execute(text("SELECT customer_account_id FROM users WHERE id=:id"), {"id": owner["id"]}).scalar()
            for table in business_tables:
                if table in inspect(engine).get_table_names():
                    conn.execute(text(f'UPDATE "{table}" SET customer_account_id=:account WHERE customer_account_id IS NULL'), {"account": account_id})


@app.on_event("startup")
def migrate_schema_on_startup():
    # Test fixtures own an in-memory database; never mutate the developer's local DB in tests.
    from app.database import get_db
    if app.dependency_overrides.get(get_db):
        return
    migrate_additive_schema()
    from app.services.backups import BackupWorker
    app.state.backup_worker = BackupWorker(engine)
    app.state.backup_worker.start()

@app.on_event("shutdown")
def stop_backup_worker():
    worker = getattr(app.state, 'backup_worker', None)
    if worker: worker.close()

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": getattr(settings, "APP_VERSION", "1.0.0")}

@app.get("/")
def root():
    return {"message": "Welcome to the API", "docs": "/docs"}
