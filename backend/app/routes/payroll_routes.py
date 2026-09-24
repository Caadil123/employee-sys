# This file has the Payroll Management routes: list, generate, edit, delete and approve payroll.
#
# The business rules are checked HERE, in the API (not only in the web page),
# so nobody can break them, even by calling the API directly:
#   1. Payroll can only be generated for ACTIVE employees.
#   2. A new payroll always starts as "pending".
#   3. Only one payroll per employee per month (no duplicates).
#   4. Total salary = base salary + bonus (calculated by the API).
#   5. Only an admin can approve. Approving changes "pending" -> "approved".
#   6. Pending payroll CAN be edited and deleted.
#   7. Approved payroll CANNOT be edited or deleted.
#
# Generating is ONE click for a whole month: every active employee gets a pending payroll
# with their own base salary and their own monthly bonus. If one month is different,
# the pending payroll can still be edited before an admin approves it.

from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_database
from app.models import Employee, Payroll, User
from app.protection import get_current_user, require_admin
from app.schemas import (
    PAYROLL_STATUS_APPROVED,
    PAYROLL_STATUS_PENDING,
    EditPayrollForm,
    GeneratePayrollAnswer,
    GeneratePayrollForm,
    PayrollInfo,
)

# All routes in this file start with "/api/payrolls"
router = APIRouter(prefix="/api/payrolls", tags=["Payroll Management"])


def find_payroll_or_stop(payroll_id: int, database: Session) -> Payroll:
    """Find a payroll by id. If there is no such payroll, stop with a 404 error."""
    found_payroll = database.get(Payroll, payroll_id)

    if found_payroll is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payroll not found",
        )

    return found_payroll


def stop_if_not_pending(payroll: Payroll, action_name: str):
    """Rule 7: an approved payroll is locked. Stop if someone tries to change it."""
    if payroll.status != PAYROLL_STATUS_PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Approved payroll cannot be {action_name}",
        )


@router.get("", response_model=list[PayrollInfo])
def list_payrolls(
    database: Session = Depends(get_database),
    current_user: User = Depends(get_current_user),  # any logged-in user can see the list
):
    """Give back all payroll records, newest first."""
    all_payrolls = database.query(Payroll).order_by(Payroll.id.desc()).all()
    return all_payrolls


@router.post("/generate", response_model=GeneratePayrollAnswer, status_code=status.HTTP_201_CREATED)
def generate_payroll_for_month(
    payroll_form: GeneratePayrollForm,
    database: Session = Depends(get_database),
    current_user: User = Depends(get_current_user),  # any logged-in user can generate payroll
):
    """ONE click: generate a pending payroll for EVERY active employee, for one month."""
    pay_month = payroll_form.pay_month

    # Rule 1: take ONLY the active employees (inactive employees never get payroll)
    active_employees = (
        database.query(Employee).filter(Employee.is_active.is_(True)).order_by(Employee.full_name).all()
    )

    # The ids of employees that ALREADY have a payroll for this month
    employee_ids_already_paid = {
        payroll.employee_id
        for payroll in database.query(Payroll).filter(Payroll.pay_month == pay_month).all()
    }

    generated_payrolls = []
    skipped_already_generated = []
    skipped_no_base_salary = []

    for employee in active_employees:
        # Rule 3: no duplicates. Skip employees that already have this month's payroll.
        if employee.id in employee_ids_already_paid:
            skipped_already_generated.append(employee.full_name)
            continue

        # We cannot pay someone whose salary is unknown. Skip, and tell the user who to fix.
        if employee.base_salary is None:
            skipped_no_base_salary.append(employee.full_name)
            continue

        # The employee's fixed monthly bonus (0 if they have none)
        bonus = employee.bonus or Decimal("0")

        new_payroll = Payroll(
            employee_id=employee.id,
            pay_month=pay_month,
            base_salary=employee.base_salary,  # taken from the employee, not from the user
            bonus=bonus,  # taken from the employee too
            # Rule 4: the API calculates the total itself
            total_salary=employee.base_salary + bonus,
            # Rule 2: a new payroll is ALWAYS pending
            status=PAYROLL_STATUS_PENDING,
        )
        database.add(new_payroll)
        generated_payrolls.append(new_payroll)

    # Nothing new to generate? Then REFUSE the request with a clear reason,
    # instead of answering "0 generated" as if it worked.
    if len(generated_payrolls) == 0:
        # "2026-09" -> "September 2026"
        month_name = datetime.strptime(pay_month, "%Y-%m").strftime("%B %Y")

        if len(active_employees) == 0:
            reason = "There are no active employees to generate payroll for."
        elif len(skipped_no_base_salary) == 0:
            # Rule 3: every active employee already has this month's payroll
            reason = f"Payroll for {month_name} has already been generated."
        else:
            # Some are already generated, the others have no base salary
            reason = (
                f"Nothing to generate for {month_name}. "
                f"Set the base salary of: {', '.join(skipped_no_base_salary)}."
            )

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

    try:
        # Save ALL new payrolls together: either all of them are saved, or none
        database.commit()
    except IntegrityError:
        # Someone else generated the same month at the same moment:
        # the database's own rule (one payroll per employee per month) stopped us
        database.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payroll for this month was just generated by someone else. Please refresh and try again.",
        )

    # Reload each new payroll to get its id and created_at
    for new_payroll in generated_payrolls:
        database.refresh(new_payroll)

    return GeneratePayrollAnswer(
        pay_month=pay_month,
        generated_payrolls=generated_payrolls,
        skipped_already_generated=skipped_already_generated,
        skipped_no_base_salary=skipped_no_base_salary,
    )


@router.put("/{payroll_id}", response_model=PayrollInfo)
def edit_payroll(
    payroll_id: int,
    payroll_form: EditPayrollForm,
    database: Session = Depends(get_database),
    current_user: User = Depends(get_current_user),  # any logged-in user can edit PENDING payroll
):
    """Change the base salary and bonus of a PENDING payroll (e.g. add this month's bonus)."""
    payroll_to_edit = find_payroll_or_stop(payroll_id, database)

    # Rule 7: approved payroll cannot be edited
    stop_if_not_pending(payroll_to_edit, "edited")

    # Update the money, and calculate the total again (rule 4)
    payroll_to_edit.base_salary = payroll_form.base_salary
    payroll_to_edit.bonus = payroll_form.bonus
    payroll_to_edit.total_salary = payroll_form.base_salary + payroll_form.bonus

    database.commit()
    database.refresh(payroll_to_edit)
    return payroll_to_edit


@router.delete("/{payroll_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payroll(
    payroll_id: int,
    database: Session = Depends(get_database),
    current_user: User = Depends(get_current_user),  # any logged-in user can delete PENDING payroll
):
    """Delete a PENDING payroll for good."""
    payroll_to_delete = find_payroll_or_stop(payroll_id, database)

    # Rule 7: approved payroll cannot be deleted
    stop_if_not_pending(payroll_to_delete, "deleted")

    database.delete(payroll_to_delete)
    database.commit()

    # 204 means: done, and there is nothing to send back
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{payroll_id}/approve", response_model=PayrollInfo)
def approve_payroll(
    payroll_id: int,
    database: Session = Depends(get_database),
    current_admin: User = Depends(require_admin),  # Rule 5: ONLY an admin can approve
):
    """Approve a pending payroll: "pending" -> "approved". After this it is locked."""
    payroll_to_approve = find_payroll_or_stop(payroll_id, database)

    # A payroll can only be approved one time
    if payroll_to_approve.status != PAYROLL_STATUS_PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This payroll is already approved",
        )

    # Change the status, and remember who approved it and when
    payroll_to_approve.status = PAYROLL_STATUS_APPROVED
    payroll_to_approve.approved_by_user_id = current_admin.id
    payroll_to_approve.approved_at = datetime.now()

    database.commit()
    database.refresh(payroll_to_approve)
    return payroll_to_approve
