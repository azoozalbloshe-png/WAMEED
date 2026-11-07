from app.database import SessionLocal
from app.services.auth_service import AuthService
from app.schemas.user import UserCreate

def main():
    db = SessionLocal()
    auth = AuthService(db)
    
    users_to_create = [
        UserCreate(email='admin@wameed.com', username='admin', password='admin123', role='admin'),
        UserCreate(email='user@wameed.com', username='user', password='user123', role='user'),
        UserCreate(email='superadmin@wameed.com', username='superadmin', password='super123', role='superadmin')
    ]
    
    for u in users_to_create:
        try:
            result = auth.register_user(u)
            print(f"✓ Created/Updated: {result.email} with role: {result.role}")
        except ValueError as e:
            print(f"✓ Skipped ({u.email}): {e}")

    print("="*50)
    print("Login Credentials:")
    print("  Admin: admin@wameed.com / admin123")
    print("  User: user@wameed.com / user123")
    print("  Superadmin: superadmin@wameed.com / super123")
    print("="*50 + "\n")

    db.close()

if __name__ == "__main__":
    main()
