# Route CRUD User + upload CSV
# TODO: GET/POST/PUT/DELETE /api/users, POST /api/users/upload-csv
from fastapi import APIRouter

router = APIRouter(prefix="/api/users", tags=["users"])
