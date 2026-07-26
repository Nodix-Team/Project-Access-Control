import paramiko
import sys

def main():
    host = "10.20.16.2"
    port = 22
    username = "root"
    password = "12345"

    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(host, port, username, password, timeout=10)
        
        print("Connected to SSH. Patching main.py...")
        sftp = ssh.open_sftp()
        sftp.put("backend/app/main.py", "/opt/project-access-control/backend/app/main.py")
        sftp.close()
        
        print("Restarting backend container...")
        stdin, stdout, stderr = ssh.exec_command("cd /opt/project-access-control && docker compose restart backend")
        print(stdout.read().decode())
        print(stderr.read().decode())
        
        ssh.close()
        print("Done!")
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    main()
