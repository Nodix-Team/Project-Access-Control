# Setup koneksi SQLAlchemy (engine, session, base model) ke MySQL
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    # Base class untuk semua model SQLAlchemy di app/models/
    pass


def get_db():
    # Dependency FastAPI: buka session per-request, tutup otomatis setelah selesai
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
