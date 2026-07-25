import requests

def test_me():
    url_login = "http://10.20.16.2/api/auth/login"
    payload = {"username": "admin", "password": "admin123"}
    resp = requests.post(url_login, json=payload)
    token = resp.json().get("access_token")
    
    url_me = "http://10.20.16.2/api/auth/me"
    headers = {"Authorization": f"Bearer {token}"}
    resp_me = requests.get(url_me, headers=headers)
    print("Status:", resp_me.status_code)
    print("Body:", resp_me.text)

if __name__ == '__main__':
    test_me()
