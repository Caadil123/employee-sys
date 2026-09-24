# This file connects our Python code to the PostgreSQL database.

import os

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Read the secret settings from the ".env" file
load_dotenv()

# Build the database address from the settings.
# We give each part separately, so special characters in the password are safe.
database_address = URL.create(
    drivername="postgresql+pg8000",  # we use PostgreSQL with the "pg8000" driver
    host=os.getenv("DATABASE_HOST", "localhost"),
    port=int(os.getenv("DATABASE_PORT", "5432")),
    database=os.getenv("DATABASE_NAME", "employee-sys"),
    username=os.getenv("DATABASE_USER", "postgres"),
    password=os.getenv("DATABASE_PASSWORD"),
)

# The engine is the connection between Python and the database
database_engine = create_engine(database_address)

# A "session" is one conversation with the database.
# We open one, run our queries, then close it.
DatabaseSession = sessionmaker(bind=database_engine, autoflush=False)


# Every table class (like User) will inherit from this base class
class BaseTable(DeclarativeBase):
    pass


def get_database():
    """Open a database session for one request, and close it when the request is done."""
    database = DatabaseSession()
    try:
        # Give the session to the code that needs it
        yield database
    finally:
        # Always close the session, even if an error happened
        database.close()
