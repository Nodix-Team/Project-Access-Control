# Route CRUD Pintu — assign ke controller, beri nama/lokasi
# TODO: GET/POST/PUT/DELETE /api/doors
from fastapi import APIRouter

router = APIRouter(prefix="/api/doors", tags=["doors"])
