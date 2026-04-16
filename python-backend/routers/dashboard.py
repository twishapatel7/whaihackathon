from fastapi import APIRouter

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
async def dashboard_placeholder():
    return {"status": "ok"}
