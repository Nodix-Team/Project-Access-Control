import pymysql
import bcrypt

def main():
    try:
        conn = pymysql.connect(
            host="10.20.16.2",
            port=3306,
            user="root",
            password="p@ssw0rd",
            database="access_control"
        )
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SHOW TABLES LIKE 'admins'")
        if not cursor.fetchone():
            print("Table 'admins' does not exist yet. Please wait for backend to start.")
            return

        # check if admin exists
        cursor.execute("SELECT * FROM admins WHERE username='admin'")
        if cursor.fetchone():
            print("Admin 'admin' already exists. Updating password to admin123...")
            hashed = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode('utf-8')
            cursor.execute("UPDATE admins SET password=%s WHERE username='admin'", (hashed,))
        else:
            print("Admin 'admin' not found. Creating it...")
            hashed = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode('utf-8')
            cursor.execute("INSERT INTO admins (username, password) VALUES (%s, %s)", ("admin", hashed))
            
        conn.commit()
        conn.close()
        print("Done!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
