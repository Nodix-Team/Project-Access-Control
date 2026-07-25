import paramiko
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def run_command(ssh, cmd):
    print(f"--- Running: {cmd} ---")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    for line in stdout: sys.stdout.write(line)
    for line in stderr: sys.stderr.write(line)
    return exit_status

def main():
    host = "10.20.16.2"
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username="root", password="12345")

    # Clone branch dev yang pasti ada di github
    run_command(ssh, "rm -rf /opt/project-access-control")
    run_command(ssh, "git clone -b dev https://github.com/danskiv/Project-Access-Control.git /opt/project-access-control")

    # Upload file docker secara langsung tanpa lewat git
    sftp = ssh.open_sftp()
    
    files_to_upload = [
        "docker-compose.yml",
        "backend/Dockerfile",
        "frontend/Dockerfile",
        "frontend/nginx.conf",
        "frontend/src/api/client.ts",
        "backend/app/main.py"
    ]
    
    for f in files_to_upload:
        local_path = os.path.join(os.getcwd(), f)
        remote_path = f"/opt/project-access-control/{f}"
        print(f"Uploading {f}...")
        sftp.put(local_path, remote_path)
    
    sftp.close()

    # Fix DNS if Docker fails to resolve docker.io
    run_command(ssh, "echo 'nameserver 8.8.8.8' > /etc/resolv.conf")
    run_command(ssh, "systemctl restart docker")

    # Jalankan Docker Compose
    run_command(ssh, "cd /opt/project-access-control && docker-compose up -d --build")
    ssh.close()

if __name__ == "__main__":
    main()
