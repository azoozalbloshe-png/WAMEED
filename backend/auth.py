# routes/auth.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime
from app.models import db, User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    identifier = data.get('username_or_email')
    password = data.get('password')

    if not identifier or not password:
        return jsonify({"error": "يرجى إدخال اسم المستخدم/البريد وكلمة المرور"}), 400

    user = User.query.filter(
        (User.username == identifier) | (User.email == identifier)
    ).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "بيانات الدخول غير صحيحة"}), 401

    if not user.is_active:
        return jsonify({"error": "الحساب معطل، يرجى التواصل مع الإدارة"}), 403

    # تحديث آخر تسجيل دخول
    user.last_login = datetime.utcnow()
    db.session.commit()

    # تضمين الـ role والـ tenant_id داخل الـ token claims
    additional_claims = {
        "role": user.role,
        "tenant_id": user.tenant_id
    }
    
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)

    return jsonify({
        "message": "تم تسجيل الدخول بنجاح",
        "access_token": access_token,
        "user": user.to_dict()
    }), 200
