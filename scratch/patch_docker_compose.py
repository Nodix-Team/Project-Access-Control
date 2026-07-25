import base64
import subprocess

def main():
    with open('docker-compose.yml', 'rb') as f:
        content = f.read()
    
    b64_content = base64.b64encode(content).decode()
    
    # Run plink to overwrite the file on Debian and restart backend
    cmd = [
        "plink", "-batch", "-pw", "12345", "root@10.20.16.2",
        f"echo {b64_content} | base64 -d > /opt/project-access-control/docker-compose.yml && cd /opt/project-access-control && docker compose up -d backend"
    ]
    
    print("Running plink...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    print("STDERR:", res.stderr)

if __name__ == "__main__":
    main()
