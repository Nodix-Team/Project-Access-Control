import subprocess

def main():
    cmd = [
        "plink", "-batch", "-pw", "12345", "root@10.20.16.2",
        "docker logs access_backend --tail 50"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    print("STDERR:", res.stderr)

if __name__ == "__main__":
    main()
