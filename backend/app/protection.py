# This file protects our API routes.
# A protected route can only be used by someone who sends a valid login token.

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_database
from app.models import User
from app.security import read_login_token

# This reads the "Authorization: Bearer <token>" header from each request.
# auto_error=False means: if it is missing, let US decide what error to send.
token_reader = HTTPBearer(auto_error=False)


def get_current_user(
    sent_token: HTTPAuthorizationCredentials | None = Depends(token_reader),
    database: Session = Depends(get_database),
) -> User:
    """Find out which user is making this request. Stop the request if they are not logged in."""
    # The error we send when the user is not logged in
    not_logged_in_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="You are not logged in, or your login has expired",
    )

    # No token was sent at all
    if sent_token is None:
        raise not_logged_in_error

    # Open the token. If it is fake or expired we get None.
    token_content = read_login_token(sent_token.credentials)
    if token_content is None:
        raise not_logged_in_error

    # Find the user that the token belongs to
    current_user = database.get(User, int(token_content["sub"]))

    # The user may have been deleted after the token was made,
    # or made inactive. An inactive user's old token stops working right away.
    if current_user is None or not current_user.is_active:
        raise not_logged_in_error

    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Allow the request only if the logged-in user is an admin."""
    if current_user.role != "admin":
        # 403 means: we know who you are, but you are not allowed to do this
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an admin can do this",
        )

    return current_user
