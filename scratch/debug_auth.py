import sys
import os
sys.path.append(os.path.abspath('backend'))

from app.auth.jwt import decode_access_token
from app.database import get_db
from app.models.admin import Admin
from sqlalchemy import select
from jose import JWTError

def debug_auth():
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc4NDMzMTgwOH0.vR2Z0oQn4uUnyrM7q4k5larwEtPdnhU__HFT3GpALs8"
    print("Decoding token...")
    try:
        payload = decode_access_token(token)
        print("Payload:", payload)
    except JWTError as e:
        print("JWTError!", e)
        return

    username = payload.get("sub")
    print("Username:", username)

    db = next(get_db())
    admin = db.scalar(select(Admin).where(Admin.username == username))
    print("Admin found:", admin)

if __name__ == '__main__':
    debug_auth()
