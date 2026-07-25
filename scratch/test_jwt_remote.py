import subprocess

def main():
    python_script = "from app.config import settings; from app.auth.jwt import create_access_token, decode_access_token; print('Secret key:', repr(settings.JWT_SECRET_KEY)); token = create_access_token({'sub': 'admin', 'role': 'admin'}); print('Generated token:', token); payload = decode_access_token(token); print('Decode success! Payload:', payload)"
    
    cmd = [
        "plink", "-batch", "-pw", "12345", "root@10.20.16.2",
        f"docker exec access_backend python -c \"{python_script}\""
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    print("STDERR:", res.stderr)

if __name__ == "__main__":
    main()
