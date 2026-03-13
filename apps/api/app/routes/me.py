from fastapi import APIRouter, Depends

from app.core.dependencies import CurrentUser, get_current_user

router = APIRouter(tags=["me"])


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Returns the current user. Uses mock auth until real integration."""
    return user
