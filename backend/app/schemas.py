# This file describes the shape of the data that comes IN to the API
# and goes OUT of the API. FastAPI uses it to check the data for us.

from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field

# The only email ending we accept for new or edited users and employees
ALLOWED_EMAIL_ENDING = "@gmail.com"


def check_gmail_only(email: str) -> str:
    """Accept the email only if it is a Gmail address, e.g. "ali@gmail.com"."""
    # Use small letters, so "Ali@GMAIL.com" is treated the same as "ali@gmail.com"
    small_letters_email = email.lower()

    # If the email does not end with "@gmail.com", stop and explain why
    if not small_letters_email.endswith(ALLOWED_EMAIL_ENDING):
        raise ValueError("Only Gmail addresses are allowed (example: name@gmail.com)")

    # The email is good, give it back in small letters
    return small_letters_email


# A Gmail email: first EmailStr checks it looks like a real email,
# then check_gmail_only checks that it ends with "@gmail.com"
GmailAddress = Annotated[EmailStr, AfterValidator(check_gmail_only)]


class LoginForm(BaseModel):
    """What the frontend sends when someone logs in."""

    email: str
    password: str


class UserInfo(BaseModel):
    """The user details we send back. Notice: NO password here."""

    # Allow FastAPI to build this from a database User object
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: str
    created_at: datetime
    is_active: bool


class LoginAnswer(BaseModel):
    """What the API sends back after a successful login."""

    login_token: str
    user: UserInfo


class NewUserForm(BaseModel):
    """What the admin sends to add a new user."""

    # The name must have 2 to 100 letters
    full_name: str = Field(min_length=2, max_length=100)

    # Must be a real email AND end with "@gmail.com"
    email: GmailAddress

    # The password must have at least 6 characters
    password: str = Field(min_length=6)

    # The role can ONLY be "admin" or "user". Anything else is rejected.
    role: Literal["admin", "user"] = "user"


class EditUserForm(BaseModel):
    """What the admin sends to change a user."""

    full_name: str = Field(min_length=2, max_length=100)

    # Must be a real email AND end with "@gmail.com"
    email: GmailAddress

    role: Literal["admin", "user"]

    # The password is optional. Leave it empty to keep the old password.
    new_password: str | None = Field(default=None, min_length=6)


# ---------- Money (used by employees and payroll) ----------

# Money: bigger than 0 for the salary, 0 or more for the bonus, at most 2 digits after the dot
BaseSalaryAmount = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]
BonusAmount = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]


# ---------- Employees ----------

# The characters a phone number may have: digits, spaces, "+" and "-"
ALLOWED_PHONE_CHARACTERS = set("0123456789 +-")


def check_phone(phone: str) -> str:
    """Accept a phone like "+252 61 234 5678": only allowed characters, and 7 to 15 digits."""
    # Remove spaces at the start and the end
    clean_phone = phone.strip()

    # Stop if there is a letter or another strange character
    for character in clean_phone:
        if character not in ALLOWED_PHONE_CHARACTERS:
            raise ValueError("A phone number can only have digits, spaces, + and -")

    # Count only the digits (not spaces, + or -)
    digit_count = sum(1 for character in clean_phone if character.isdigit())
    if digit_count < 7 or digit_count > 15:
        raise ValueError("A phone number must have 7 to 15 digits")

    return clean_phone


def check_hire_date(hire_date: date) -> date:
    """The hire date cannot be in the future."""
    if hire_date > date.today():
        raise ValueError("The hire date cannot be in the future")

    return hire_date


class EmployeeForm(BaseModel):
    """What the admin sends to add OR edit an employee (the same fields for both)."""

    full_name: str = Field(min_length=2, max_length=100)

    # Must be a real email AND end with "@gmail.com"
    email: GmailAddress

    # Checked by check_phone above
    phone: Annotated[str, AfterValidator(check_phone)]

    department: str = Field(min_length=2, max_length=100)
    job_title: str = Field(min_length=2, max_length=100)

    # A date like "2026-09-24", checked by check_hire_date above
    hire_date: Annotated[date, AfterValidator(check_hire_date)]

    # The monthly base salary, must be bigger than 0 (e.g. 1500 or 1500.50)
    base_salary: BaseSalaryAmount

    # The fixed monthly bonus, 0 or more. Leave it out for no bonus.
    bonus: BonusAmount = Decimal("0")


class EmployeeInfo(BaseModel):
    """The employee details we send back."""

    # Allow FastAPI to build this from a database Employee object
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    phone: str
    department: str
    job_title: str
    hire_date: date
    base_salary: float | None  # None = not set yet (old employees)
    bonus: float
    is_active: bool
    created_at: datetime


# ---------- Payroll ----------

# The two payroll statuses. A new payroll is always "pending".
PAYROLL_STATUS_PENDING = "pending"
PAYROLL_STATUS_APPROVED = "approved"


def check_pay_month(pay_month: str) -> str:
    """Accept a month like "2026-09". It cannot be a month in the future."""
    # Check the shape: 4 digits, a dash, 2 digits
    month_parts = pay_month.split("-")
    if len(pay_month) != 7 or len(month_parts) != 2 or not month_parts[0].isdigit() or not month_parts[1].isdigit():
        raise ValueError("The month must look like 2026-09")

    year_number = int(month_parts[0])
    month_number = int(month_parts[1])

    # A month must be between 1 (January) and 12 (December)
    if month_number < 1 or month_number > 12:
        raise ValueError("The month must be between 01 and 12")

    # We cannot pay a month that has not started yet
    today = date.today()
    if (year_number, month_number) > (today.year, today.month):
        raise ValueError("You cannot generate payroll for a future month")

    return pay_month


class GeneratePayrollForm(BaseModel):
    """What the user sends to generate payroll for ALL active employees, for one month.
    Notice: only the month. The API takes each employee's base salary and bonus itself,
    and always sets the status to "pending"."""

    pay_month: Annotated[str, AfterValidator(check_pay_month)]


class EditPayrollForm(BaseModel):
    """What the user sends to edit a PENDING payroll (e.g. to add this month's bonus).
    Only the money can change."""

    base_salary: BaseSalaryAmount
    bonus: BonusAmount = Decimal("0")


class PayrollInfo(BaseModel):
    """The payroll details we send back."""

    # Allow FastAPI to build this from a database Payroll object
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: str
    employee_department: str
    pay_month: str

    # We send money as normal numbers (e.g. 1500.5), easy for the frontend to use
    base_salary: float
    bonus: float
    total_salary: float

    status: str
    approved_by_user_id: int | None
    approved_at: datetime | None
    created_at: datetime


class GeneratePayrollAnswer(BaseModel):
    """What the API sends back after one-click generation."""

    pay_month: str

    # The new pending payrolls
    generated_payrolls: list[PayrollInfo]

    # Names of active employees we skipped, and why
    skipped_already_generated: list[str]  # they already have a payroll for this month
    skipped_no_base_salary: list[str]  # their base salary is not set yet
