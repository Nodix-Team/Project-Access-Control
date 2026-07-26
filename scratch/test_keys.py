import sys
from jose import jwt

def main():
    token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc4NDMzMTgwOH0.vR2Z0oQn4uUnyrM7q4k5larwEtPdnhU__HFT3GpALs8'
    keys = [
        "super-secret-jwt-key",
        '"super-secret-jwt-key"',
        "secret_key_sementara_untuk_dev_12345",
        "",
        "\"\""
    ]
    for key in keys:
        print(f"Trying key: '{key}'")
        try:
            payload = jwt.decode(token, key, algorithms=['HS256'])
            print("SUCCESS! The key is:", key)
            return
        except Exception as e:
            print("Failed:", e)
    print("None of the keys worked!")

if __name__ == '__main__':
    main()
