# Run this script ONE time to add the "base_salary" column to the employees table.
#
# Why do we need it?
# "create_all" in main.py only creates tables that do NOT exist yet.
# Our "employees" table already exists, so it will not get the new column by itself.
#
# Existing employees get an EMPTY base salary. Edit each one and set their salary,
# otherwise payroll generation will skip them (and tell you their names).
#
# How to run:  python add_base_salary_column.py

from sqlalchemy import text

from app.database import database_engine

# "IF NOT EXISTS" makes it safe to run again: the second time it does nothing.
# NUMERIC(12, 2) = money with 2 digits after the dot, e.g. 1500.50
add_column_command = text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS base_salary NUMERIC(12, 2)")

# "begin()" opens a connection and saves (commits) the change at the end
with database_engine.begin() as connection:
    connection.execute(add_column_command)

print("The 'base_salary' column is ready. Set the salary of your existing employees by editing them.")
