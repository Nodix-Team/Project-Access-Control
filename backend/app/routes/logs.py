# Route GET logs + filter (kartu, controller, door, tanggal, result)
# TODO: GET /api/logs
from fastapi import APIRouter

router = APIRouter(prefix="/api/logs", tags=["logs"])
