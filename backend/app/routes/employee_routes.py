# This file has the Employee Management routes: list, add, edit, deactivate and activate employees.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_database
from app.models import Employee, User
from app.protection import get_current_user, require_admin
from app.schemas import EmployeeForm, EmployeeInfo

# All routes in this file start with "/api/employees"
router = APIRouter(prefix="/api/employees", tags=["Employee Management"])


def find_employee_or_stop(employee_id: int, database: Session) -> Employee:
    """Find an employee by id. If there is no such employee, stop with a 404 error."""
    found_employee = database.get(Employee, employee_id)

    if found_employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    return found_employee


def stop_if_email_is_taken(email: str, database: Session, allowed_employee_id: int | None = None):
    """Stop with an error if another employee already has this email."""
    employee_with_same_email = database.query(Employee).filter(Employee.email == email).first()

    # It is OK if the email belongs to the same employee we are editing
    if employee_with_same_email is not None and employee_with_same_email.id != allowed_employee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Another employee already has this email",
        )


def copy_form_to_employee(employee_form: EmployeeForm, employee: Employee):
    """Copy the details from the form into the employee (used by add AND edit)."""
    employee.full_name = employee_form.full_name.strip()
    employee.email = employee_form.email  # already in small letters (see check_gmail_only)
    employee.phone = employee_form.phone
    employee.department = employee_form.department.strip()
    employee.job_title = employee_form.job_title.strip()
    employee.hire_date = employee_form.hire_date
    employee.base_salary = employee_form.base_salary
    employee.bonus = employee_form.bonus


@router.get("", response_model=list[EmployeeInfo])
def list_employees(
    database: Session = Depends(get_database),
    current_user: User = Depends(get_current_user),  # any logged-in user can see the list
):
    """Give back all employees, newest first."""
    all_employees = database.query(Employee).order_by(Employee.id.desc()).all()
    return all_employees


@router.post("", response_model=EmployeeInfo, status_code=status.HTTP_201_CREATED)
def add_employee(
    employee_form: EmployeeForm,
    database: Session = Depends(get_database),
    current_admin: User = Depends(require_admin),  # only an admin can add employees
):
    """Add a new employee to the database."""
    # Two employees cannot share the same email
    stop_if_email_is_taken(employee_form.email, database)

    # Build the new employee from the form
    new_employee = Employee()
    copy_form_to_employee(employee_form, new_employee)

    # Add the employee and save (commit) the change
    database.add(new_employee)
    database.commit()

    # Reload from the database to get the new id, is_active and created_at
    database.refresh(new_employee)
    return new_employee


@router.put("/{employee_id}", response_model=EmployeeInfo)
def edit_employee(
    employee_id: int,
    employee_form: EmployeeForm,
    database: Session = Depends(get_database),
    current_admin: User = Depends(require_admin),  # only an admin can edit employees
):
    """Change the details of an existing employee."""
    # Find the employee we want to change
    employee_to_edit = find_employee_or_stop(employee_id, database)

    # The new email must not belong to a DIFFERENT employee
    stop_if_email_is_taken(employee_form.email, database, allowed_employee_id=employee_to_edit.id)

    # Update the details and save
    copy_form_to_employee(employee_form, employee_to_edit)
    database.commit()
    database.refresh(employee_to_edit)
    return employee_to_edit


def change_active_status(employee_id: int, make_active: bool, database: Session) -> Employee:
    """Make an employee active or inactive. Used by the two routes below."""
    employee_to_change = find_employee_or_stop(employee_id, database)

    # Change the status and save it. The employee stays in the database (soft-delete).
    employee_to_change.is_active = make_active
    database.commit()
    database.refresh(employee_to_change)
    return employee_to_change


@router.patch("/{employee_id}/deactivate", response_model=EmployeeInfo)
def deactivate_employee(
    employee_id: int,
    database: Session = Depends(get_database),
    current_admin: User = Depends(require_admin),  # only an admin can deactivate employees
):
    """Soft-delete: make the employee inactive. Their data is kept."""
    return change_active_status(employee_id, False, database)


@router.patch("/{employee_id}/activate", response_model=EmployeeInfo)
def activate_employee(
    employee_id: int,
    database: Session = Depends(get_database),
    current_admin: User = Depends(require_admin),  # only an admin can activate employees
):
    """Bring an inactive employee back to active."""
    return change_active_status(employee_id, True, database)
