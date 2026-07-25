import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def run_command(ssh, cmd):
    print(f"\n--- {cmd} ---")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    for line in stdout: sys.stdout.write(line)
    for line in stderr: sys.stderr.write(line)

def main():
    host = "10.20.16.2"
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username="root", password="12345", timeout=10)

    run_command(ssh, "docker ps -a")
    run_command(ssh, "docker logs access_frontend --tail 20")
    
    ssh.close()

if __name__ == "__main__":
    main()
