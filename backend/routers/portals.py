from fastapi import APIRouter
from config import PORTALS

router = APIRouter(prefix="/portals", tags=["portals"])


@router.get("")
async def list_portals():
    """Returns the list of supported procurement portals."""
    return [
        {
            "key": key,
            "name": p["name"],
            "description": p["description"],
            "url": p["url"],
            "icon": p["icon"],
            "color": p["color"],
        }
        for key, p in PORTALS.items()
    ]
