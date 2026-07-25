import requests
from jose import jwt

def main():
    url_login = "http://10.20.16.2/api/auth/login"
    payload = {"username": "admin", "password": "admin123"}
    resp = requests.post(url_login, json=payload)
    if resp.status_code != 200:
        print("Login failed:", resp.status_code, resp.text)
        return
        
    token = resp.json().get("access_token")
    print("Got token:", token)
    
    keys = [
        "super-secret-jwt-key",
        '"super-secret-jwt-key"',
        "secret_key_sementara_untuk_dev_12345",
        "",
        "\"\""
    ]
    for key in keys:
        try:
            payload = jwt.decode(token, key, algorithms=['HS256'])
            print("SUCCESS! The key is:", key)
            
            # Now test /me
            url_me = "http://10.20.16.2/api/auth/me"
            headers = {"Authorization": f"Bearer {token}"}
            resp_me = requests.get(url_me, headers=headers)
            print("/me Status:", resp_me.status_code)
            print("/me Body:", resp_me.text)
            return
        except Exception as e:
            pass
            
    print("None of the keys worked for the fresh token either!")

if __name__ == '__main__':
    main()
