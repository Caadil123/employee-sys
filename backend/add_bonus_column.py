# Run this script ONE time to add the "bonus" column to the employees table.
#
# Why do we need it?
# "create_all" in main.py only creates tables that do NOT exist yet.
# Our "employees" table already exists, so it will not get the new column by itself.
#
# Existing employees get a bonus of 0. Edit an employee to give them a monthly bonus.
#
# How to run:  python add_bonus_column.py

from sqlalchemy import text

from app.database import database_engine

# "IF NOT EXISTS" makes it safe to run again: the second time it does nothing.
# "NOT NULL DEFAULT 0" = every employee always has a bonus, 0 if they have none.
add_column_command = text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS bonus NUMERIC(12, 2) NOT NULL DEFAULT 0")

# "begin()" opens a connection and saves (commits) the change at the end
with database_engine.begin() as connection:
    connection.execute(add_column_command)

print("The 'bonus' column is ready. All existing employees have a bonus of 0.")
