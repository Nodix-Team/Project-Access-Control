# Loader konfigurasi dari file .env menggunakan pydantic-settings
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Database MySQL ---
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "access_control"
    DB_PASSWORD: str = ""
    DB_NAME: str = "access_control"

    # --- JWT Auth ---
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    # --- MQTT / EMQX Broker ---
    MQTT_HOST: str = "localhost"
    MQTT_PORT: int = 1883
    MQTT_USERNAME: str = "backend"
    MQTT_PASSWORD: str = ""

    # --- WebSocket Auth (lihat app/ws/auth.py) ---
    # Belum diaktifkan di app ini (WS /ws/live-feed masih bebas diakses tanpa token). Struktur
    # validasinya sudah ada supaya tinggal di-set True kalau proteksi WS mau dinyalakan.
    AUTH_ENABLED: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def database_url(self) -> str:
        # Format DSN untuk SQLAlchemy + driver PyMySQL
        import urllib.parse
        encoded_password = urllib.parse.quote_plus(self.DB_PASSWORD)
        return (
            f"mysql+pymysql://{self.DB_USER}:{encoded_password}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


@lru_cache
def get_settings() -> Settings:
    # Cache instance Settings agar .env hanya dibaca sekali
    return Settings()


settings = get_settings()
