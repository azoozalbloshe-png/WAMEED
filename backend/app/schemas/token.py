from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Literal
from app.schemas.user import UserResponse

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: str | None = None
    role: str | None = None

class PasswordResetRequest(BaseModel):
    method: Literal['email', 'sms', 'whatsapp'] = 'email'
    email: EmailStr | None = None
    phone: str | None = Field(None, pattern=r'^\+[1-9]\d{7,14}$')

    @model_validator(mode='after')
    def destination_required(self):
        if self.method == 'email' and not self.email:
            raise ValueError('البريد الإلكتروني مطلوب')
        if self.method != 'email' and not self.phone:
            raise ValueError('رقم الجوال مع مفتاح الدولة مطلوب')
        return self

class PasswordResetResponse(BaseModel):
    message: str
    request_id: str
    email: str | None = None

class RecoveryCodeRequest(BaseModel):
    request_id: str = Field(min_length=30, max_length=100)
    code: str = Field(pattern=r'^\d{4,10}$')
