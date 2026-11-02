# routes/admin.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from app.models import db, User
admin_bp = Blueprint('admin', __name__)

def verify_super_admin():
    claims = get_jwt()
    if claims.get("role") != "super_admin":
        return jsonify({"error": "غير مصرح لك بالوصول، هذه المنطقة خاصة بالمطور"}), 403
    return None

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    err = verify_super_admin()
    if err: return err

    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

@admin_bp.route('/users', methods=['POST'])
@jwt_required()
def create_user():
    err = verify_super_admin()
    if err: return err

    data = request.get_json() or {}
    if User.query.filter((User.username == data.get('username')) | (User.email == data.get('email'))).first():
        return jsonify({"error": "اسم المستخدم أو البريد الإلكتروني مسجل مسابقاً"}), 400

    new_user = User(
        username=data.get('username'),
        email=data.get('email'),
        phone_number=data.get('phone_number'),
        role=data.get('role', 'admin')
    )
    new_user.set_password(data.get('password', '12345678'))
    
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "تم إنشاء الحساب بنجاح", "user": new_user.to_dict()}), 201

@admin_bp.route('/users/<int:user_id>/status', methods=['PATCH'])
@jwt_required()
def toggle_user_status(user_id):
    err = verify_super_admin()
    if err: return err

    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    user.is_active = data.get('is_active', user.is_active)
    db.session.commit()
    return jsonify({"message": "تم تحديث حالة الحساب", "user": user.to_dict()}), 200
