# This file has the login routes.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_database
from app.models import User
from app.protection import get_current_user
from app.schemas import LoginAnswer, LoginForm, UserInfo
from app.security import check_password, create_login_token

# All routes in this file start with "/api"
router = APIRouter(prefix="/api", tags=["Authentication"])


@router.post("/login", response_model=LoginAnswer)
def login(login_form: LoginForm, database: Session = Depends(get_database)):
    """Check the email and password. If they are correct, give back a login token."""
    # Emails are saved in small letters, so we compare in small letters too
    typed_email = login_form.email.strip().lower()

    # Find the user with this email
    found_user = database.query(User).filter(User.email == typed_email).first()

    # If no user has this email, or the password is wrong, stop here.
    # We give the SAME message in both cases, so an attacker
    # cannot find out which emails exist in our system.
    if found_user is None or not check_password(login_form.password, found_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong email or password",
        )

    # The password is correct, but an inactive (soft-deleted) user cannot log in
    if not found_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is inactive. Please contact the admin.",
        )

    # Create a login token that remembers who this user is and their role
    login_token = create_login_token(user_id=found_user.id, user_role=found_user.role)

    # Send back the token and the user's details
    return LoginAnswer(login_token=login_token, user=found_user)


@router.get("/me", response_model=UserInfo)
def get_my_details(current_user: User = Depends(get_current_user)):
    """A protected route: give back the details of the logged-in user."""
    # get_current_user already checked the token, so here we just return the user
    return current_user
