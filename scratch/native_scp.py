import subprocess

def main():
    print("Uploading client.ts using native SCP...")
    # scp frontend/src/api/client.ts root@10.20.16.2:/opt/project-access-control/frontend/src/api/client.ts
    cmd1 = ["scp", "-o", "StrictHostKeyChecking=no", "frontend/src/api/client.ts", "root@10.20.16.2:/opt/project-access-control/frontend/src/api/client.ts"]
    subprocess.run(cmd1)
    
    print("Restarting frontend container...")
    # ssh root@10.20.16.2 "cd /opt/project-access-control && docker compose up -d --build frontend"
    cmd2 = ["ssh", "-o", "StrictHostKeyChecking=no", "root@10.20.16.2", "cd /opt/project-access-control && docker compose up -d --build frontend"]
    subprocess.run(cmd2)
    
    print("Done!")

if __name__ == "__main__":
    main()
