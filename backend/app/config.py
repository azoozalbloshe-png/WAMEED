from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
from pathlib import Path
import os
import secrets

def local_secret():
    path = Path(os.getenv("DATA_DIR", str(Path(__file__).resolve().parents[1]))) / ".jwt-secret"
    try:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w") as stream:
            stream.write(secrets.token_urlsafe(48))
    except FileExistsError:
        pass
    return path.read_text().strip()


class Settings(BaseSettings):
    APP_NAME: str = "Web API"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "Modern Web Application API"
    
    # Database
    DATABASE_URL: str = "sqlite:///./app.db"
    DATABASE_ECHO: bool = False
    BACKUP_ENABLED: bool = True
    BACKUP_DIR: str = str(Path(os.getenv("DATA_DIR", str(Path(__file__).resolve().parents[1]))) / "backups")
    BACKUP_INTERVAL_HOURS: int = Field(24, ge=1, le=8760)
    BACKUP_RETENTION_COUNT: int = Field(30, ge=1, le=365)
    
    # Security
    # Keep compatibility with the key previously used by AuthService so current
    # sessions remain valid unless the operator explicitly configured a key.
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_FROM: str = ""
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_SECURITY: str = "starttls"
    TWILIO_API_KEY: str = ""
    TWILIO_API_SECRET: str = ""
    TWILIO_VERIFY_SERVICE_SID: str = ""
    TWILIO_RECOVERY_SERVICE_SID: str = ""
    RECOVERY_SMS_ENABLED: bool = False
    RECOVERY_WHATSAPP_ENABLED: bool = False

    # Frontend URL
    FRONTEND_URL: str = "http://localhost:5173"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
if not settings.SECRET_KEY or settings.SECRET_KEY in ("your-secret-key-here", "your-secret-key"):
    settings.SECRET_KEY = local_secret()
