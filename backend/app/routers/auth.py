from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer

from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.schemas.token import PasswordResetRequest, PasswordResetResponse, RecoveryCodeRequest
from app.services.auth_service import AuthService
from app.security import limit_auth


from pydantic import BaseModel, Field

class ResetPasswordBody(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    new_password: str = Field(min_length=10, max_length=72)

auth_bp = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


@auth_bp.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(user_data: UserCreate, request: Request, db=Depends(get_db)):
    'Register a new user.'
    limit_auth(db,request,user_data.email,"register")
    auth_service = AuthService(db)

    try:
        return auth_service.register_user(user_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@auth_bp.post("/login", response_model=Token)
async def login(user_data: UserLogin, request: Request, db=Depends(get_db)):
    'Sign in'
    limit_auth(db,request,user_data.email,"login")
    auth_service = AuthService(db)

    try:
        return auth_service.authenticate_user(
            user_data.email,
            user_data.password,
            user_data.remember_me,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


@auth_bp.get("/recovery-options")
def recovery_options():
    from app.services.recovery_service import options
    return options()


@auth_bp.post("/forgot-password", response_model=PasswordResetResponse)
def forgot_password(data: PasswordResetRequest, request: Request, db=Depends(get_db)):
    from app.services.recovery_service import start
    return start(db, data, request.client.host if request.client else 'unknown')


@auth_bp.post("/recovery/verify")
def verify_recovery(data: RecoveryCodeRequest, db=Depends(get_db)):
    from app.services.recovery_service import confirm
    return confirm(db, data)


@auth_bp.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(data: "ResetPasswordBody", db=Depends(get_db)):
    'Reset password'
    auth_service = AuthService(db)

    try:
        auth_service.reset_password(data.token, data.new_password)
        return {"message": "Password reset successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db=Depends(get_db),
):
    'Get the current user.'
    auth_service = AuthService(db)
    payload = auth_service.decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = auth_service.get_user_by_email(email)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_version = payload.get("ver")
    if token_version != (user.token_version or 0):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Your session expired. Sign in again.',
            headers={"WWW-Authenticate": "Bearer"},
        )

    from app.models.user import CustomerAccount
    account = db.get(CustomerAccount, user.customer_account_id)
    if not account or account.status != "active":
        raise HTTPException(status_code=401, detail='Your workspace is suspended.')
    return user


@auth_bp.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    """Return the authenticated user's current server-side profile."""
    return AuthService.user_response(current_user)


@auth_bp.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Revoke all previously issued tokens for this account."""
    current_user.token_version = (current_user.token_version or 0) + 1
    db.commit()
    return None


async def get_current_active_user(
    current_user=Depends(get_current_user),
):
    'Get the active user.'
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    return current_user


def get_current_superuser(
    current_user=Depends(get_current_active_user),
):
    'Get the platform administrator.'
    if not current_user.is_superuser or current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )

    return current_user
