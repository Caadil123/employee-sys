// One popup form for BOTH adding a new employee and editing an existing employee.
// - Add:  <EmployeeFormModal employeeToEdit={null} ... />
// - Edit: <EmployeeFormModal employeeToEdit={someEmployee} ... />

import { useState } from "react";
import { sendRequest } from "../../api";
import Modal from "../Modal/Modal";

// Today's date as "2026-09-24" (in the user's own time zone).
// We use it so the date picker cannot choose a day in the future.
function getTodayText() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // months start at 0, so we add 1
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// "departmentSuggestions" = a list of department names to suggest while typing
export default function EmployeeFormModal({ employeeToEdit, departmentSuggestions, onClose, onSaved }) {
  // If we got an employee, we are editing. If not, we are adding.
  const isEditing = employeeToEdit !== null;

  // The form boxes. When editing, they start with the employee's current details.
  const [fullName, setFullName] = useState(isEditing ? employeeToEdit.full_name : "");
  const [email, setEmail] = useState(isEditing ? employeeToEdit.email : "");
  const [phone, setPhone] = useState(isEditing ? employeeToEdit.phone : "");
  const [department, setDepartment] = useState(isEditing ? employeeToEdit.department : "");
  const [jobTitle, setJobTitle] = useState(isEditing ? employeeToEdit.job_title : "");
  const [hireDate, setHireDate] = useState(isEditing ? employeeToEdit.hire_date : getTodayText());
  // Old employees may have no salary yet (null), so we start with an empty box for them
  const [baseSalary, setBaseSalary] = useState(
    isEditing && employeeToEdit.base_salary !== null ? String(employeeToEdit.base_salary) : ""
  );
  const [bonus, setBonus] = useState(isEditing ? String(employeeToEdit.bonus) : "0");

  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Runs when the admin clicks "Save"
  async function handleSave(event) {
    // Stop the browser from reloading the page
    event.preventDefault();

    setErrorMessage("");
    setIsSaving(true);

    // The same details are sent for add and edit
    const employeeDetails = {
      full_name: fullName,
      email: email,
      phone: phone,
      department: department,
      job_title: jobTitle,
      hire_date: hireDate,
      base_salary: baseSalary,
      bonus: bonus === "" ? "0" : bonus, // an empty box means no bonus
    };

    try {
      let savedEmployee;

      if (isEditing) {
        // EDIT: PUT /api/employees/3
        savedEmployee = await sendRequest(`/api/employees/${employeeToEdit.id}`, "PUT", employeeDetails);
      } else {
        // ADD: POST /api/employees
        savedEmployee = await sendRequest("/api/employees", "POST", employeeDetails);
      }

      // Tell the page it worked (it will reload the list and close the popup)
      onSaved(savedEmployee);
    } catch (saveError) {
      // Show the backend's reason, e.g. "phone: A phone number must have 7 to 15 digits"
      setErrorMessage(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal title={isEditing ? "Edit Employee" : "Add New Employee"} onClose={onClose}>
      <form onSubmit={handleSave}>
        {errorMessage && <div className="modal-error">{errorMessage}</div>}

        <div className="form-field">
          <label htmlFor="employee-name">Full name</label>
          <input
            id="employee-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="e.g. Ahmed Ali"
            minLength={2}
            maxLength={100}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="employee-email">Email</label>
          <input
            id="employee-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@gmail.com"
            required
          />
          <p className="field-hint">Only Gmail addresses are allowed.</p>
        </div>

        <div className="form-field">
          <label htmlFor="employee-phone">Phone</label>
          <input
            id="employee-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="e.g. +252 61 234 5678"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="employee-department">Department</label>
          {/* "list" connects this box to the <datalist> below, so it suggests departments while typing */}
          <input
            id="employee-department"
            list="department-suggestions"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            placeholder="e.g. Finance"
            minLength={2}
            maxLength={100}
            required
          />
          <datalist id="department-suggestions">
            {departmentSuggestions.map((departmentName) => (
              <option key={departmentName} value={departmentName} />
            ))}
          </datalist>
        </div>

        <div className="form-field">
          <label htmlFor="employee-job-title">Job title</label>
          <input
            id="employee-job-title"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            placeholder="e.g. Accountant"
            minLength={2}
            maxLength={100}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="employee-hire-date">Hire date</label>
          <input
            id="employee-hire-date"
            type="date"
            value={hireDate}
            onChange={(event) => setHireDate(event.target.value)}
            max={getTodayText()} // no days in the future
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="employee-base-salary">Base salary per month ($)</label>
          <input
            id="employee-base-salary"
            type="number"
            min="0.01"
            step="0.01" // allow cents, e.g. 1500.50
            value={baseSalary}
            onChange={(event) => setBaseSalary(event.target.value)}
            placeholder="e.g. 1500"
            required
          />
          <p className="field-hint">Used every month when payroll is generated.</p>
        </div>

        <div className="form-field">
          <label htmlFor="employee-bonus">Bonus per month ($)</label>
          <input
            id="employee-bonus"
            type="number"
            min="0"
            step="0.01"
            value={bonus}
            onChange={(event) => setBonus(event.target.value)}
            placeholder="0"
          />
        </div>

        <div className="modal-buttons">
          <button type="button" className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="save-button" disabled={isSaving}>
            {isSaving ? "Saving..." : isEditing ? "Save changes" : "Add employee"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
