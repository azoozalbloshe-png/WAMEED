"""Interactive local bootstrap; does not overwrite existing accounts."""
import getpass
from app.main import migrate_additive_schema
from app.database import SessionLocal
from app.models.user import User, CustomerAccount, AuditLog
from app.services.auth_service import AuthService
from app.schemas.user import UserBase

def create_super_admin():
    email=input('Developer email: ').strip()
    username=input('Developer username: ').strip()
    UserBase(email=email, username=username)
    password=getpass.getpass('Password (12 characters minimum): ')
    if len(password)<12 or len(password.encode())>72 or password!=getpass.getpass('Confirm password: '):
        raise SystemExit('Passwords must match; use 12 characters minimum and 72 bytes maximum.')
    migrate_additive_schema()
    with SessionLocal() as db:
        if db.query(User).filter(User.is_superuser.is_(True)).first():
            raise SystemExit('A developer already exists; setup will not overwrite it.')
        if db.query(User).filter((User.email==email)|(User.username==username)).first():
            raise SystemExit('Username or email already exists.')
        user=User(email=email,username=username,role='super_admin',is_superuser=True,hashed_password=AuthService(db).get_password_hash(password))
        db.add(user);db.flush()
        account=CustomerAccount(name=username,owner_user_id=user.id)
        db.add(account);db.flush()
        user.customer_account_id=account.id
        db.add(AuditLog(actor_user_id=user.id,action='developer.bootstrap',target_type='user',target_id=str(user.id)))
        db.commit()
    print('Developer account created.')

if __name__=='__main__':
    create_super_admin()
