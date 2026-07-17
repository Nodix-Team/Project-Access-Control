import requests
import json
import sys

EMQX_API = "http://127.0.0.1:18083/api/v5"
AUTH_USER = "admin"
AUTH_PASS = "p@ssw0rd"

def main():
    print("Mencoba login ke EMQX API...")
    # 1. Login
    login_url = f"{EMQX_API}/login"
    login_data = {"username": AUTH_USER, "password": AUTH_PASS}
    
    try:
        r = requests.post(login_url, json=login_data, timeout=5)
    except Exception as e:
        print(f"Gagal konek ke EMQX API: {e}")
        return

    if r.status_code != 200:
        print(f"Gagal login (Mungkin password admin bukan 'public' lagi). Status: {r.status_code}")
        return
        
    token = r.json().get("token")
    headers = {"Authorization": f"Bearer {token}"}
    print("Login berhasil! Mendapatkan token.")

    # 2. Buat Authentication (Password-Based, Built-in Database)
    print("Membuat pengaturan Authentication (Built-in Database)...")
    auth_url = f"{EMQX_API}/authentication"
    auth_payload = {
        "mechanism": "password_based",
        "backend": "built_in_database",
        "password_hash_algorithm": {
            "name": "sha256",
            "salt_position": "prefix"
        },
        "user_id_type": "username"
    }
    
    r_auth = requests.post(auth_url, json=auth_payload, headers=headers)
    if r_auth.status_code in [200, 201]:
        print("-> Authentication berhasil dibuat.")
    elif r_auth.status_code == 400 and "already_exists" in r_auth.text:
        print("-> Authentication sudah ada sebelumnya (Aman).")
    else:
        print(f"-> Gagal membuat Authentication: {r_auth.text}")
    
    # 3. Tambahkan 3 Users
    print("\nMenambahkan user MQTT...")
    users = [
        {"user_id": "backend", "password": "backend123"},
        {"user_id": "ctrl-A", "password": "ctrlA123"},
        {"user_id": "ctrl-B", "password": "ctrlB123"}
    ]
    
    users_url = f"{EMQX_API}/authentication/password_based:built_in_database/users"
    for user in users:
        r_user = requests.post(users_url, json=user, headers=headers)
        if r_user.status_code in [200, 201]:
            print(f"-> User '{user['user_id']}' berhasil ditambahkan.")
        elif r_user.status_code == 400 and "already_exists" in r_user.text:
            print(f"-> User '{user['user_id']}' sudah terdaftar sebelumnya.")
        else:
            print(f"-> Gagal menambah user '{user['user_id']}': {r_user.text}")

    # 4. Matikan Allow Anonymous (Opsional tapi direkomendasikan)
    print("\nMematikan fitur 'Allow Anonymous' agar tidak sembarang orang bisa konek...")
    authz_url = f"{EMQX_API}/authorization/settings"
    authz_payload = {"no_match": "deny", "deny_action": "ignore"}
    requests.put(authz_url, json=authz_payload, headers=headers)
    print("-> Selesai! EMQX Anda sekarang sudah aman dengan password.")

if __name__ == "__main__":
    main()
