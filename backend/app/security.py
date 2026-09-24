# This file keeps passwords safe using bcrypt,
# and creates / reads login tokens (JWT).

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from dotenv import load_dotenv

# Read the secret settings from the ".env" file
load_dotenv()

# The secret key signs our tokens. Only the server knows it,
# so nobody else can make a fake token.
TOKEN_SECRET_KEY = os.getenv("TOKEN_SECRET_KEY")

# How many minutes a token stays valid before the user must log in again
TOKEN_LIFETIME_MINUTES = int(os.getenv("TOKEN_LIFETIME_MINUTES", "60"))

# The method used to sign the token
TOKEN_ALGORITHM = "HS256"


def hash_password(plain_password: str) -> str:
    """Turn a real password into a scrambled hash that we can save in the database."""
    # A "salt" is random data added to the password,
    # so two users with the same password get different hashes
    random_salt = bcrypt.gensalt()

    # Scramble the password together with the salt
    hashed_bytes = bcrypt.hashpw(plain_password.encode("utf-8"), random_salt)

    # Turn the result into normal text so we can save it in the database
    return hashed_bytes.decode("utf-8")


def check_password(typed_password: str, saved_hash: str) -> bool:
    """Check if the password the user typed matches the hash saved in the database."""
    # bcrypt scrambles the typed password the same way and compares the results.
    # It returns True if they match, and False if they don't.
    return bcrypt.checkpw(typed_password.encode("utf-8"), saved_hash.encode("utf-8"))


def create_login_token(user_id: int, user_role: str) -> str:
    """Create a signed token (like an entry ticket) that says who the user is."""
    # The time when this token stops working
    expire_time = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_LIFETIME_MINUTES)

    # The information we put inside the token
    token_content = {
        "sub": str(user_id),  # "sub" (subject) = which user this token belongs to
        "role": user_role,  # "admin" or "user"
        "exp": expire_time,  # "exp" (expire) = when the token stops working
    }

    # Sign the content with our secret key and return the token text
    return jwt.encode(token_content, TOKEN_SECRET_KEY, algorithm=TOKEN_ALGORITHM)


def read_login_token(login_token: str) -> dict | None:
    """Open a token and return what is inside it. Return None if it is fake or expired."""
    try:
        # Check the signature and the expire time, then return the content
        return jwt.decode(login_token, TOKEN_SECRET_KEY, algorithms=[TOKEN_ALGORITHM])
    except jwt.InvalidTokenError:
        # The token was changed, signed with another key, or is too old
        return None
