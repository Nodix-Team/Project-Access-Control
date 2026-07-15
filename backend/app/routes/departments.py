# Route CRUD Department + set default akses (department_access)
# TODO: GET/POST/PUT/DELETE /api/departments
from fastapi import APIRouter

router = APIRouter(prefix="/api/departments", tags=["departments"])
