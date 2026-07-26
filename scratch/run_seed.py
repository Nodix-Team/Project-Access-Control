import os
from sqlalchemy import create_engine, text

def main():
    # URL to the remote MariaDB on Debian
    db_url = "mysql+pymysql://root:p%40ssw0rd@10.20.16.2:3306/access_control"
    engine = create_engine(db_url)
    
    seed_file = os.path.join("database", "seed.sql")
    if not os.path.exists(seed_file):
        print(f"File {seed_file} not found!")
        return
        
    with open(seed_file, "r", encoding="utf-8") as f:
        sql = f.read()
        
    print("Executing seed.sql...")
    
    with engine.connect() as conn:
        # Split by semicolon and execute each statement
        statements = [s.strip() for s in sql.split(';') if s.strip()]
        for stmt in statements:
            try:
                conn.execute(text(stmt))
                print(f"Executed: {stmt[:50]}...")
            except Exception as e:
                # Ignore duplicates for admins if we already ran create_admin.py
                if "Duplicate entry 'admin'" in str(e):
                    print("Admin already exists, skipping...")
                else:
                    print(f"Error executing: {stmt[:50]}... -> {e}")
        conn.commit()
    print("Seed complete!")

if __name__ == '__main__':
    main()
