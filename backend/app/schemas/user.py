from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    phone: Optional[str] = Field(None, pattern=r'^\+[1-9]\d{7,14}$')
    password: str = Field(..., min_length=10, max_length=72)


class UserLogin(BaseModel):
    # The login form accepts either the registered email or username.
    email: str = Field(..., min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=72)
    remember_me: bool = False


class TokenData(BaseModel):
    email: Optional[str] = None


class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime
    full_name: Optional[str] = None
    phone: Optional[str] = None
    customer_account_id: Optional[int] = None
    last_login_at: Optional[datetime] = None
    email_verified_at: Optional[datetime] = None
    phone_verified_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    password: Optional[str] = Field(None, min_length=10, max_length=72)
