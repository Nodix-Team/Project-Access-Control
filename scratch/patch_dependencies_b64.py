import base64
import subprocess

def main():
    new_dependencies = """
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.jwt import decode_access_token
from app.database import get_db
from app.models.admin import Admin

security_scheme = HTTPBearer()

def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme), db: Session = Depends(get_db)
) -> Admin:
    token = credentials.credentials

    try:
        payload = decode_access_token(token)
    except JWTError as e:
        raise HTTPException(status_code=418, detail=f"JWTError: {e}")

    username = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=418, detail="username is None")

    try:
        admin = db.scalar(select(Admin).where(Admin.username == username))
    except Exception as e:
        raise HTTPException(status_code=418, detail=f"DB Error: {e}")
        
    if admin is None:
        raise HTTPException(status_code=418, detail="admin is None in DB")

    return admin
"""
    b64_content = base64.b64encode(new_dependencies.encode()).decode()
    
    # Run plink to overwrite the file on Debian and restart backend
    cmd = [
        "plink", "-batch", "-pw", "12345", "root@10.20.16.2",
        f"echo {b64_content} | base64 -d > /opt/project-access-control/backend/app/auth/dependencies.py && cd /opt/project-access-control && docker compose restart backend"
    ]
    
    print("Running plink...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    print("STDERR:", res.stderr)

if __name__ == "__main__":
    main()
