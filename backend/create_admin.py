# Run this script ONE time to create the first admin user.
# We need it because only an admin can add other users,
# so somebody has to exist before the website can be used.
#
# How to run:  python create_admin.py

from getpass import getpass

from app.database import BaseTable, DatabaseSession, database_engine
from app.models import User
from app.schemas import check_gmail_only
from app.security import hash_password

# Make sure the "users" table exists before we add anyone
BaseTable.metadata.create_all(bind=database_engine)

# Ask for the admin details in the terminal
admin_name = input("Admin full name: ")
admin_email = input("Admin email: ").strip().lower()

# The admin email must also be a Gmail address (the same rule as the API)
try:
    check_gmail_only(admin_email)
except ValueError as email_problem:
    print(email_problem)
    raise SystemExit(1)  # stop the script here

admin_password = getpass("Admin password (hidden while typing): ")

# Open a conversation with the database
database = DatabaseSession()

# Check if a user with this email already exists
existing_user = database.query(User).filter(User.email == admin_email).first()

if existing_user is not None:
    print("A user with this email already exists. Nothing was added.")
else:
    # Build the new admin user. We save the HASH, not the real password.
    new_admin = User(
        full_name=admin_name,
        email=admin_email,
        hashed_password=hash_password(admin_password),
        role="admin",
    )

    # Add the user and save (commit) the change in the database
    database.add(new_admin)
    database.commit()
    print(f"Admin '{admin_email}' was created successfully.")

# Close the conversation with the database
database.close()
