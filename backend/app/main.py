# Entry point FastAPI — Access Control API v0.2
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.auth.router import router as auth_router
from app.mqtt import client as mqtt_client
from app.routes.controllers import router as controllers_router
from app.routes.departments import router as departments_router
from app.routes.doors import router as doors_router
from app.routes.logs import router as logs_router
from app.routes.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    mqtt_client.start()
    yield
    mqtt_client.stop()


app = FastAPI(title="Access Control API v0.2", lifespan=lifespan)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(departments_router)
app.include_router(controllers_router)
app.include_router(doors_router)
app.include_router(logs_router)


@app.get("/health")
def health_check():
    # Healthcheck sederhana untuk memastikan server + koneksi MQTT hidup
    return {"status": "ok", "mqtt_connected": mqtt_client.is_connected()}
