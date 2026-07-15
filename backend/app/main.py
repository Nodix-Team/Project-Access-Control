# Entry point FastAPI — Access Control API v0.2
from fastapi import FastAPI

app = FastAPI(title="Access Control API v0.2")


@app.get("/health")
def health_check():
    # Healthcheck sederhana untuk memastikan server hidup
    return {"status": "ok"}
