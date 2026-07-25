import subprocess

def main():
    python_script = """
import asyncio
from app.auth.jwt import decode_access_token
from app.auth.dependencies import get_current_admin
from fastapi.security import HTTPAuthorizationCredentials
from app.database import get_db
from sqlalchemy import select
from app.models.admin import Admin

token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc4NDMzMTgwOH0.vR2Z0oQn4uUnyrM7q4k5larwEtPdnhU__HFT3GpALs8'
try:
    print('Decoding token...')
    payload = decode_access_token(token)
    print('Payload:', payload)
except Exception as e:
    print('Decode Failed:', e)

try:
    print('Checking DB...')
    db = next(get_db())
    admin = db.scalar(select(Admin).where(Admin.username == 'admin'))
    print('Admin from DB:', admin)
except Exception as e:
    print('DB Check Failed:', e)
"""
    # Write the script into a temporary file on the host, then copy to VM using SCP?
    # No, we can just pipe it into `docker exec access_backend python -` using plink!
    
    cmd = [
        "plink", "-batch", "-pw", "12345", "root@10.20.16.2",
        f"docker exec -i access_backend python -"
    ]
    print("Running plink...")
    res = subprocess.run(cmd, input=python_script, capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    print("STDERR:", res.stderr)

if __name__ == "__main__":
    main()
