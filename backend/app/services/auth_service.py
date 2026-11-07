from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt

from app.models.user import User
from app.models.user import CustomerAccount
from app.config import settings
from app.schemas.token import Token, TokenData, PasswordResetRequest, PasswordResetResponse
from app.schemas.user import UserCreate, UserResponse

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
RESET_TOKEN_EXPIRE_MINUTES = 15


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def get_password_hash(self, password: str) -> str:
        if len(password.encode()) > 72:
            raise ValueError('Password exceeds the 72-byte limit.')
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        if len(plain_password.encode()) > 72:
            return False
        return pwd_context.verify(plain_password, hashed_password)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def decode_token(self, token: str) -> Optional[dict]:
        """Decode a JWT token and return the payload."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None

    def create_reset_token(self, email: str) -> str:
        import secrets
        return secrets.token_urlsafe(32)

    def save_reset_token(self, token: str, email: str, commit: bool = True, phone: str | None = None):
        import hashlib
        from app.models.user import PasswordReset
        user = self.get_user_by_email(email)
        if not user:
            return
        self.db.query(PasswordReset).filter(PasswordReset.user_id == user.id, PasswordReset.used_at.is_(None)).update({"used_at": datetime.utcnow()})
        self.db.add(PasswordReset(user_id=user.id, issued_email=user.email, issued_phone=phone, user_version=user.token_version, token_hash=hashlib.sha256(token.encode()).hexdigest(), expires_at=datetime.utcnow() + timedelta(minutes=15)))
        if commit:
            self.db.commit()

    def reset_password(self, token: str, new_password: str) -> bool:
        import hashlib
        from app.models.user import PasswordReset
        if len(new_password) < 10 or len(new_password.encode()) > 72:
            raise ValueError('Password must contain at least 10 characters and no more than 72 bytes.')
        now = datetime.utcnow()
        entry = self.db.query(PasswordReset).filter(PasswordReset.token_hash == hashlib.sha256(token.encode()).hexdigest(), PasswordReset.used_at.is_(None), PasswordReset.expires_at > now).first()
        if not entry:
            raise ValueError("Invalid or expired reset token")
        user = self.get_user_by_id(entry.user_id)
        if not user or not user.is_active or (entry.issued_email is not None and entry.issued_email != user.email) or (entry.user_version is not None and entry.user_version != user.token_version) or (entry.issued_phone is not None and (entry.issued_phone != user.phone or not user.phone_verified_at)):
            raise ValueError("Invalid or expired reset token")
        # A conditional update prevents two requests from consuming the same token.
        claimed = self.db.query(PasswordReset).filter(PasswordReset.id == entry.id, PasswordReset.used_at.is_(None)).update({"used_at": now})
        if not claimed:
            self.db.rollback()
            raise ValueError("Invalid or expired reset token")
        user = self.get_user_by_id(entry.user_id)
        user.hashed_password = self.get_password_hash(new_password)
        user.token_version = (user.token_version or 0) + 1
        user.failed_login_attempts = 0
        user.locked_until = None
        self.db.query(PasswordReset).filter(PasswordReset.user_id == user.id, PasswordReset.used_at.is_(None)).update({"used_at": now})
        from app.models.user import RecoveryRequest, AuditLog
        self.db.query(RecoveryRequest).filter(RecoveryRequest.user_id == user.id, RecoveryRequest.used_at.is_(None)).update({"used_at": now})
        self.db.add(AuditLog(actor_user_id=user.id, customer_account_id=user.customer_account_id, action="password.recovered", target_type="user", target_id=str(user.id)))
        self.db.commit()
        return True

    def register_user(self, user_data: UserCreate) -> UserResponse:
        """Register a new user."""
        existing_user = self.get_user_by_email(user_data.email)
        if existing_user:
            raise ValueError("Email already registered")

        existing_username = self.get_user_by_username(user_data.username)
        if existing_username:
            raise ValueError("Username already taken")

        user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=self.get_password_hash(user_data.password),
            role="admin",
            phone=user_data.phone,
        )
        self.db.add(user)
        self.db.flush()

        account = CustomerAccount(name=user_data.username, owner_user_id=user.id)
        self.db.add(account)
        self.db.flush()
        user.customer_account_id = account.id
        self.db.commit()
        self.db.refresh(user)

        return self.user_response(user)

    @staticmethod
    def user_response(user: User) -> UserResponse:
        return UserResponse.model_validate(user)

    def authenticate_user(self, username: str, password: str, remember_me: bool = False) -> Token:
        """Authenticate a user and return a token."""
        user = self.get_user_by_email(username) or self.get_user_by_username(username)
        now = datetime.utcnow()
        if user and user.locked_until and user.locked_until > now:
            raise ValueError('Sign-in is temporarily locked after unsuccessful attempts. Try again later.')
        if not user or not self.verify_password(password, user.hashed_password):
            if user:
                user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
                if user.failed_login_attempts >= 5:
                    user.locked_until = now + timedelta(minutes=15)
                self.db.commit()
            raise ValueError("Invalid credentials")
        account = self.db.get(CustomerAccount, user.customer_account_id)
        if not account or account.status != "active":
            raise ValueError('Your workspace is suspended.')
        if not user.is_active:
            raise ValueError('Your account is suspended. Contact the platform administrator.')

        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = now
        self.db.commit()
        self.db.refresh(user)
        duration = timedelta(days=14) if remember_me else timedelta(hours=8)
        access_token = self.create_access_token(
            data={"sub": user.email, "role": user.role, "ver": user.token_version or 0},
            expires_delta=duration,
        )
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=self.user_response(user),
        )

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        return self.db.query(User).filter(User.email == email).first()

    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        return self.db.query(User).filter(User.username == username).first()

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        return self.db.query(User).filter(User.id == user_id).first()
