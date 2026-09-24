# This file describes our database tables as Python classes.
# One class = one table. One attribute = one column.

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint, func, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import BaseTable


class User(BaseTable):
    # The name of the table inside PostgreSQL
    __tablename__ = "users"

    # A unique number for each user. The database fills it in by itself (1, 2, 3...)
    id: Mapped[int] = mapped_column(primary_key=True)

    # The user's full name, for example "Abdi Omar"
    full_name: Mapped[str] = mapped_column(String(100))

    # The email is used to log in. Two users cannot have the same email.
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)

    # The scrambled (hashed) password. We NEVER save the real password.
    hashed_password: Mapped[str] = mapped_column(String(255))

    # The role is "admin" or "user". New users are "user" by default.
    role: Mapped[str] = mapped_column(String(20), default="user")

    # The date and time the user was added. The database fills it in by itself.
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # True = active (can log in). False = inactive (soft-deleted, cannot log in).
    # We never really delete a user, we only make them inactive.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())


class Employee(BaseTable):
    # The name of the table inside PostgreSQL.
    # Employees are the company's staff records. They do NOT log in (that is the "users" table).
    __tablename__ = "employees"

    # A unique number for each employee. The database fills it in by itself.
    id: Mapped[int] = mapped_column(primary_key=True)

    # The employee's full name, for example "Ahmed Ali"
    full_name: Mapped[str] = mapped_column(String(100))

    # The work email. Two employees cannot have the same email.
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)

    # The phone number, for example "+252 61 234 5678"
    phone: Mapped[str] = mapped_column(String(20))

    # The department, for example "Finance" or "IT"
    department: Mapped[str] = mapped_column(String(100))

    # The job title, for example "Accountant"
    job_title: Mapped[str] = mapped_column(String(100))

    # The day the employee started working (a date only, no time)
    hire_date: Mapped[date] = mapped_column(Date)

    # The monthly base salary, used when payroll is generated (e.g. 1500.00).
    # It can be empty for old employees that were added before this column existed.
    base_salary: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    # A fixed bonus paid every month, added to the base salary when payroll is generated.
    # 0 = no bonus. (A different bonus for one month can still be set by editing that pending payroll.)
    bonus: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, server_default="0")

    # True = active (still working here). False = inactive (soft-deleted, left the company).
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())

    # The date and time the record was added. The database fills it in by itself.
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Payroll(BaseTable):
    # The name of the table inside PostgreSQL.
    # One payroll = the salary of ONE employee for ONE month.
    __tablename__ = "payrolls"

    # The database itself refuses two payrolls for the same employee and month.
    # (The API checks this too, but this is the last safety net.)
    __table_args__ = (UniqueConstraint("employee_id", "pay_month", name="one_payroll_per_employee_per_month"),)

    # A unique number for each payroll. The database fills it in by itself.
    id: Mapped[int] = mapped_column(primary_key=True)

    # Which employee this payroll is for (a link to the "employees" table)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)

    # The month of the payroll, written as "2026-09"
    pay_month: Mapped[str] = mapped_column(String(7))

    # Money: Numeric(12, 2) = up to 12 digits, 2 of them after the dot (e.g. 1500.50).
    # We use Numeric (not float) so money is always exact.
    base_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    bonus: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    # Total salary = base salary + bonus. The API calculates it, never the user.
    total_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2))

    # "pending" when generated, "approved" after an admin approves it
    status: Mapped[str] = mapped_column(String(20), default="pending")

    # Who approved it and when (empty while pending)
    approved_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # The date and time the payroll was generated. The database fills it in by itself.
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Load the employee together with the payroll, so we can show the employee's name.
    # lazy="joined" = get both in ONE database query.
    employee: Mapped["Employee"] = relationship(lazy="joined")

    # Shortcuts, so the API can send the employee's name and department with each payroll
    @property
    def employee_name(self) -> str:
        return self.employee.full_name

    @property
    def employee_department(self) -> str:
        return self.employee.department
