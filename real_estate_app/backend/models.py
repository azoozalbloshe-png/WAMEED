# app/models.py أو المسار الخاص بالـ models لديك
from datetime import datetime
import uuid
from werkzeug.security import generate_password_hash, check_password_hash
# استورد db حسب إعدادات مشروعك
from .database import db # أو من المجلد المناسب

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.String(36), default=lambda: str(uuid.uuid4()), nullable=False, index=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone_number = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(256), nullable=False)
    
    # الصلاحيات: 'super_admin', 'admin', 'manager', 'accountant', 'employee'
    role = db.Column(db.String(20), default='admin', nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "username": self.username,
            "email": self.email,
            "phone_number": self.phone_number,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None
        }
