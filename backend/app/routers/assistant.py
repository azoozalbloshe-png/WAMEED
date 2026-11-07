from typing import Literal, Optional
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, ConfigDict
from app.config import settings
from app.database import get_db
from app.routers.auth import get_current_active_user
from app.security import limit_auth
from app.services.assistant import ai_answer, direct_answer

router = APIRouter(prefix='/api/assistant')

class Message(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    role: Literal['user', 'assistant']
    content: str = Field(min_length=1, max_length=6000)

class Chat(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    message: str = Field(min_length=1, max_length=1500)
    history: list[Message] = Field(default_factory=list, max_length=8)
    language: Literal['ar', 'en'] = 'ar'
    topic: Optional[Literal['overdue', 'expiring', 'finance', 'properties']] = None

@router.get('/status')
def status(user=Depends(get_current_active_user)):
    return {'mode': 'ai' if settings.OPENAI_API_KEY.strip() else 'direct'}

@router.post('/chat')
def chat(data: Chat, request: Request, db=Depends(get_db), user=Depends(get_current_active_user)):
    limit_auth(db, request, str(user.id), 'assistant')
    if not settings.OPENAI_API_KEY.strip():
        return direct_answer(db, user, data.message, data.language, data.topic)
    return ai_answer(db, user, data.message, data.history, data.language)
