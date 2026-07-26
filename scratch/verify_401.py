import requests

def main():
    url_login = "http://10.20.16.2/api/auth/login"
    payload = {"username": "admin", "password": "admin123"}
    resp = requests.post(url_login, json=payload)
    if resp.status_code != 200:
        print("Login Failed:", resp.status_code, resp.text)
        return
        
    token = resp.json().get("access_token")
    print("Login Success. Token:", token)
    
    url_me = "http://10.20.16.2/api/auth/me"
    headers = {"Authorization": f"Bearer {token}"}
    resp_me = requests.get(url_me, headers=headers)
    print("Me Status:", resp_me.status_code)
    print("Me Headers:", resp_me.headers)
    print("Me Body:", resp_me.text)

if __name__ == '__main__':
    main()
