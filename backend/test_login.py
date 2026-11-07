import sqlite3
import os
from werkzeug.security import check_password_hash

db_path = os.path.join(os.path.dirname(__file__), 'app.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

email = " "
raw_password = " "

cursor.execute("SELECT email, hashed_password FROM users WHERE email = ?", (email,))
user = cursor.fetchone()

if user:
    db_email, db_hash = user
    is_valid = check_password_hash(db_hash, raw_password)
    print(f"User found: {db_email}")
    print(f"Password match test: {is_valid}")
else:
    print("User not found in database!")

conn.close()
