from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime
from app.models import db, User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    identifier = data.get('username_or_email') or data.get('email')
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

    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active
        }
    }), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email')
    if not email:
        return jsonify({"error": "البريد الإلكتروني مطلوب"}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "إذا كان البريد موجوداً، سيتم إرسال رابط إعادة التعيين", "email": email}), 200
        
    return jsonify({"message": "تم إرسال رابط إعادة تعيين كلمة المرور بنجاح", "email": email}), 200
