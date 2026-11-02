from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from app.models import db, User, Tenant, AuditLog

admin_bp = Blueprint('admin', __name__)

def admin_required():
    claims = get_jwt()
    if claims.get("role") != "super_admin":
        return jsonify({"error": "غير مصرح لك بالوصول، هذه المنطقة خاصة بالمطوّر"}), 403

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    err = admin_required()
    if err: return err
    
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

@admin_bp.route('/users/<int:user_id>/status', methods=['PATCH'])
@jwt_required()
def toggle_user_status(user_id):
    err = admin_required()
    if err: return err

    user = User.query.get_or_404(user_id)
    if user.role == "super_admin":
        return jsonify({"error": "لا يمكن تعطيل حساب المطوّر الأساسي"}), 400

    user.is_active = not user.is_active
    db.session.commit()
    return jsonify({"message": "تم تغيير حالة الحساب بنجاح", "is_active": user.is_active}), 200
