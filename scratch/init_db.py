from app.database import engine, Base
# Import all models so metadata knows about them
from app.models.admin import Admin
from app.models.department import Department
from app.models.door import Door
from app.models.user import User
from app.models.user_access import UserAccess
from app.models.access_log import AccessLog
import pymysql

def init_db():
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

if __name__ == '__main__':
    init_db()
