# This file has the User Management routes: list, add, edit, deactivate and activate users.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_database
from app.models import User
from app.protection import get_current_user, require_admin
from app.schemas import EditUserForm, NewUserForm, UserInfo
from app.security import hash_password

# All routes in this file start with "/api/users"
router = APIRouter(prefix="/api/users", tags=["User Management"])


def find_user_or_stop(user_id: int, database: Session) -> User:
    """Find a user by id. If there is no such user, stop with a 404 error."""
    found_user = database.get(User, user_id)

    if found_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return found_user


def stop_if_email_is_taken(email: str, database: Session, allowed_user_id: int | None = None):
    """Stop with an error if another user already has this email."""
    user_with_same_email = database.query(User).filter(User.email == email).first()

    # It is OK if the email belongs to the same user we are editing
    if user_with_same_email is not None and user_with_same_email.id != allowed_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Another user already has this email",
        )


@router.get("", response_model=list[UserInfo])
def list_users(
    database: Session = Depends(get_database),
    current_user: User = Depends(get_current_user),  # any logged-in user can see the list
):
    """Give back all users, newest first."""
    all_users = database.query(User).order_by(User.id.desc()).all()
    return all_users


@router.post("", response_model=UserInfo, status_code=status.HTTP_201_CREATED)
def add_user(
    new_user_form: NewUserForm,
    database: Session = Depends(get_database),
    current_admin: User = Depends(require_admin),  # only an admin can add users
):
    """Add a new user to the database."""
    # Save emails in small letters, so "Ali@Mail.com" and "ali@mail.com" are the same
    new_email = new_user_form.email.lower()

    # Two users cannot share the same email
    stop_if_email_is_taken(new_email, database)

    # Build the new user. We save the HASH of the password, never the real password.
    new_user = User(
        full_name=new_user_form.full_name.strip(),
        email=new_email,
        hashed_password=hash_password(new_user_form.password),
        role=new_user_form.role,
    )

    # Add the user and save (commit) the change
    database.add(new_user)
    database.commit()

    # Reload the user from the database to get the new id and created_at
    database.refresh(new_user)
    return new_user


@router.put("/{user_id}", response_model=UserInfo)
def edit_user(
    user_id: int,
    edit_user_form: EditUserForm,
    database: Session = Depends(get_database),
    current_admin: User = Depends(require_admin),  # only an admin can edit users
):
    """Change the details of an existing user."""
    # Find the user we want to change
    user_to_edit = find_user_or_stop(user_id, database)

    # Save emails in small letters
    new_email = edit_user_form.email.lower()

    # The new email must not belong to a DIFFERENT user
    stop_if_email_is_taken(new_email, database, allowed_user_id=user_to_edit.id)

    # An admin cannot remove their own admin role,
    # otherwise the system could be left with no admin at all
    if user_to_edit.id == current_admin.id and edit_user_form.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin role",
        )

    # Update the details
    user_to_edit.full_name = edit_user_form.full_name.strip()
    user_to_edit.email = new_email
    user_to_edit.role = edit_user_form.role

    # Change the password only if a new one was given
    if edit_user_form.new_password:
        user_to_edit.hashed_password = hash_password(edit_user_form.new_password)

    # Save the changes
    database.commit()
    database.refresh(user_to_edit)
    return user_to_edit


def change_active_status(user_id: int, make_active: bool, database: Session, current_admin: User) -> User:
    """Make a user active or inactive. Used by the two routes below."""
    # Find the user we want to change
    user_to_change = find_user_or_stop(user_id, database)

    # An admin cannot deactivate themselves, otherwise they would lock themselves out
    if user_to_change.id == current_admin.id and not make_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    # Change the status and save it. The user stays in the database (soft-delete).
    user_to_change.is_active = make_active
    database.commit()
    database.refresh(user_to_change)
    return user_to_change


@router.patch("/{user_id}/deactivate", response_model=UserInfo)
def deactivate_user(
    user_id: int,
    database: Session = Depends(get_database),
    current_admin: User = Depends(require_admin),  # only an admin can deactivate users
):
    """Soft-delete: make the user inactive. They cannot log in, but their data is kept."""
    return change_active_status(user_id, False, database, current_admin)


@router.patch("/{user_id}/activate", response_model=UserInfo)
def activate_user(
    user_id: int,
    database: Session = Depends(get_database),
    current_admin: User = Depends(require_admin),  # only an admin can activate users
):
    """Bring an inactive user back. They can log in again."""
    return change_active_status(user_id, True, database, current_admin)
