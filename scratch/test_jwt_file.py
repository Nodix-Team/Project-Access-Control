import subprocess

def main():
    python_script = """
import sys
from app.config import settings
from app.auth.jwt import create_access_token, decode_access_token

try:
    with open('/tmp/jwt_debug.txt', 'w') as f:
        f.write(f"Secret: {repr(settings.JWT_SECRET_KEY)}\\n")
        token = create_access_token({"sub": "admin", "role": "admin"})
        f.write(f"Token: {token}\\n")
        payload = decode_access_token(token)
        f.write(f"Payload: {payload}\\n")
        f.write("SUCCESS\\n")
except Exception as e:
    with open('/tmp/jwt_debug.txt', 'a') as f:
        f.write(f"ERROR: {type(e)} {e}\\n")
"""
    cmd = [
        "plink", "-batch", "-pw", "12345", "root@10.20.16.2",
        f"docker exec access_backend python -c \"{python_script}\""
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    print("STDERR:", res.stderr)
    
    cmd2 = [
        "plink", "-batch", "-pw", "12345", "root@10.20.16.2",
        "docker exec access_backend cat /tmp/jwt_debug.txt"
    ]
    res2 = subprocess.run(cmd2, capture_output=True, text=True)
    print("STDOUT2:", res2.stdout)

if __name__ == "__main__":
    main()
