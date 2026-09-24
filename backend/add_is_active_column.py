# Run this script ONE time to add the "is_active" column to the users table.
#
# Why do we need it?
# "create_all" in main.py only creates tables that do NOT exist yet.
# Our "users" table already exists, so it will not get the new column by itself.
# This script adds the column to the existing table.
#
# How to run:  python add_is_active_column.py

from sqlalchemy import text

from app.database import database_engine

# The SQL command that adds the column.
# "IF NOT EXISTS" makes it safe to run again: the second time it does nothing.
# "DEFAULT TRUE" makes every existing user active.
add_column_command = text(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE"
)

# "begin()" opens a connection and saves (commits) the change at the end
with database_engine.begin() as connection:
    connection.execute(add_column_command)

print("The 'is_active' column is ready. All existing users are active.")
