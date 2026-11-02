import os
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from models import db, User, Tenant, AuditLog
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

auth_bp = Blueprint('auth', __name__)

def init_super_admin():
    """تنزيل وتأمين حساب المطوّر الأساسي تلقائياً عند التشغيل إذا لم يكن موجوداً"""
    admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@womeed.com")
    existing_admin = User.query.filter_by(email=admin_email).first()
    if not existing_admin:
        admin_pass = os.getenv("SUPER_ADMIN_PASSWORD", "SecurePass2026!")
        super_user = User(
            username="super_admin",
            email=admin_email,
            role="super_admin",
            is_active=True
        )
        super_user.set_password(admin_pass)
        db.session.add(super_user)
        db.session.commit()
        print("تم إنشاء حساب Super Admin للمطوّر بنجاح.")

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    identifier = data.get('identifier') # بريد إلكتروني أو اسم مستخدم
    password = data.get('password')

    user = User.query.filter((User.email == identifier) | (User.username == identifier)).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "بيانات تسجيل الدخول غير صحيحة"}), 401

    if not user.is_active:
        print(f"محاولة دخول على حساب موقوف: {user.email}")
        return jsonify({"error": "هذا الحساب معطل، يرجى التواصل مع الإدارة"}), 403

    # تحديث وقت آخر تسجيل دخول
    user.last_login = datetime.utcnow()
    
    # تسجيل العملية في الـ Audit Log
    log = AuditLog(user_id=user.id, action="تسجيل دخول ناجح", ip_address=request.remote_addr)
    db.session.add(log)
    db.session.commit()

    # إنشاء توكن الصلاحية
    access_token = create_access_token(
        identity=str(user.id), 
        additional_claims={"role": user.role, "tenant_id": user.tenant_id},
        expires_delta=timedelta(days=7)
    )

    return jsonify({
        "message": "تم تسجيل الدخول بنجاح",
        "token": access_token,
        "user": user.to_dict()
    }), 200
