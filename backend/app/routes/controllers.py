# Route CRUD Controller + push/pull config + status online
# TODO: GET /api/controllers, GET/PUT /api/controllers/{id}/config, POST /api/controllers/{id}/sync
from fastapi import APIRouter

router = APIRouter(prefix="/api/controllers", tags=["controllers"])
