import subprocess

def main():
    cmd = [
        "plink", "-batch", "-pw", "12345", "root@10.20.16.2",
        "docker exec access_backend python -c \"from app.config import settings; print('SECRET:', settings.JWT_SECRET_KEY)\""
    ]
    print("Running plink...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    print("STDERR:", res.stderr)

if __name__ == "__main__":
    main()
