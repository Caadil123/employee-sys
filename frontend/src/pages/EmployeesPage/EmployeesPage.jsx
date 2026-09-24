// The Employees page: shows all employees from the database in a DataTable
// (with a search box, pagination and sorting).
// Admins can also add, edit, deactivate (soft-delete) and activate employees.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DataTable from "datatables.net-react";
import { sendRequest } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import EmployeeFormModal from "../../components/EmployeeFormModal/EmployeeFormModal";
import PageLayout from "../../components/PageLayout/PageLayout";
import UserAvatar from "../../components/UserAvatar/UserAvatar";
import { formatMoney } from "../../formatters";
import "../../styles/TablePage.css";
import "./EmployeesPage.css";

// Departments we always suggest in the form (the admin can still type a new one)
const DEFAULT_DEPARTMENTS = ["Administration", "Finance", "Human Resources", "IT", "Marketing", "Sales"];

export default function EmployeesPage() {
  const { currentUser } = useAuth();

  // Only admins see the Add / Edit / Deactivate buttons
  const isAdmin = currentUser.role === "admin";

  // The list of employees we get from the backend
  const [employeeList, setEmployeeList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Which employees to show: "all", "active" or "inactive".
  // We start with "active", like the design: people who left are hidden until you ask for them.
  const [statusFilter, setStatusFilter] = useState("active");

  // The Add / Edit popup:
  // isFormOpen = is the popup open?  employeeBeingEdited = null when adding, an employee when editing
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [employeeBeingEdited, setEmployeeBeingEdited] = useState(null);

  // The employee we are about to deactivate or activate (null = no "Are you sure?" popup)
  const [employeeToChangeStatus, setEmployeeToChangeStatus] = useState(null);

  // A short green message after an action, e.g. "Ahmed Ali was added"
  const [successMessage, setSuccessMessage] = useState("");

  // Load (or reload) all employees from the backend
  async function loadEmployees() {
    try {
      const employeesFromDatabase = await sendRequest("/api/employees");
      setEmployeeList(employeesFromDatabase);
      setErrorMessage("");
    } catch (loadError) {
      setErrorMessage(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  // When the page opens, load the employees one time
  useEffect(() => {
    loadEmployees();
  }, []);

  // Show a green message, then hide it after 3 seconds
  function showSuccess(messageText) {
    setSuccessMessage(messageText);
    setTimeout(() => setSuccessMessage(""), 3000);
  }

  // ---------- Add and Edit ----------

  function openAddForm() {
    setEmployeeBeingEdited(null); // null = we are adding a new employee
    setIsFormOpen(true);
  }

  function openEditForm(oneEmployee) {
    setEmployeeBeingEdited(oneEmployee); // the employee we want to change
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEmployeeBeingEdited(null);
  }

  // Runs after the popup saved the employee successfully
  function handleEmployeeSaved(savedEmployee) {
    const wasEditing = employeeBeingEdited !== null;
    closeForm();
    showSuccess(wasEditing ? `${savedEmployee.full_name} was updated` : `${savedEmployee.full_name} was added`);
    loadEmployees(); // get the fresh list from the database
  }

  // ---------- Deactivate and Activate ----------

  // Runs when the admin clicks "Yes" in the "Are you sure?" popup
  async function changeEmployeeStatus() {
    // Active employees get deactivated, inactive employees get activated
    const actionName = employeeToChangeStatus.is_active ? "deactivate" : "activate";

    // PATCH /api/employees/3/deactivate   or   PATCH /api/employees/3/activate
    const changedEmployee = await sendRequest(
      `/api/employees/${employeeToChangeStatus.id}/${actionName}`,
      "PATCH"
    );

    setEmployeeToChangeStatus(null); // close the popup
    showSuccess(`${changedEmployee.full_name} is now ${changedEmployee.is_active ? "active" : "inactive"}`);
    loadEmployees();
  }

  // ---------- Department suggestions for the form ----------

  // The default departments + every department already used, without repeats, A to Z
  const departmentSuggestions = useMemo(() => {
    const usedDepartments = employeeList.map((oneEmployee) => oneEmployee.department);
    const allDepartments = new Set([...DEFAULT_DEPARTMENTS, ...usedDepartments]); // a Set removes repeats
    return [...allDepartments].sort();
  }, [employeeList]);

  // ---------- The rows for the DataTable ----------

  // useMemo: only rebuild the rows when the employees or the filter change.
  // (DataTables redraws the whole table every time it gets new rows.)
  const tableRows = useMemo(() => {
    return (
      employeeList
        // 1) Keep only the employees that match the status filter
        .filter((oneEmployee) => {
          if (statusFilter === "active") return oneEmployee.is_active;
          if (statusFilter === "inactive") return !oneEmployee.is_active;
          return true; // "all"
        })
        // 2) Add ready-to-search texts. The search box searches these, so it can find
        //    an employee by name OR job title, and by phone OR email.
        .map((oneEmployee) => ({
          ...oneEmployee,
          name_text: `${oneEmployee.full_name} ${oneEmployee.job_title}`,
          contact_text: `${oneEmployee.phone} ${oneEmployee.email}`,
          status_text: oneEmployee.is_active ? "Active" : "Inactive",
        }))
    );
  }, [employeeList, statusFilter]);

  // Which field of each row goes in which column (same order as the <th> headers)
  const tableColumns = [
    { data: "id" },
    { data: "name_text" },
    { data: "department" },
    { data: "contact_text" },
    { data: "base_salary", defaultContent: "" }, // "defaultContent": old employees may have no salary
    { data: "bonus" },
    { data: "hire_date" },
    { data: "status_text" },
  ];

  // The Actions column: only for admins. It has no data, and cannot be sorted or searched.
  if (isAdmin) {
    tableColumns.push({ data: null, orderable: false, searchable: false });
  }

  // DataTables settings
  const tableSettings = {
    pageLength: 10, // 10 employees per page
    lengthMenu: [5, 10, 25, 50], // choices for "Show X entries"
    order: [[0, "desc"]], // sort by ID, biggest first (newest employees on top)

    // Give inactive employees a faded row
    createdRow: (rowElement, rowData) => {
      if (!rowData.is_active) {
        rowElement.classList.add("inactive-row");
      }
    },

    // Our own texts instead of the default English texts
    language: {
      search: "",
      searchPlaceholder: "Search employees...",
      lengthMenu: "Show _MENU_ entries",
      info: "Showing _START_ to _END_ of _TOTAL_ employees",
      infoEmpty: "No employees to show",
      infoFiltered: "(filtered from _MAX_)",
      zeroRecords: "No matching employees found",
      emptyTable: "No employees to show",
    },
  };

  // "Slots" draw our own React design inside a column (by column number).
  // Each slot gets (data, type, row):
  //  - type "display" = the cell the user SEES  -> we give our design
  //  - other types (search, sort)              -> we give plain text, so search and sort still work
  const tableSlots = {
    // Column 1: avatar + name, with the job title under the name
    1: (data, type, row) => {
      if (type !== "display") return data;
      return (
        <div className="name-cell">
          <UserAvatar fullName={row.full_name} size={40} />
          <div>
            <div className="name-text">{row.full_name}</div>
            <div className="job-title-text">{row.job_title}</div>
          </div>
        </div>
      );
    },

    // Column 3: phone on top, email under it (like the design)
    3: (data, type, row) => {
      if (type !== "display") return data;
      return (
        <div>
          <div className="phone-text">{row.phone}</div>
          <div className="email-text">{row.email}</div>
        </div>
      );
    },

    // Column 4: base salary as "$1,500.00", or a red "Not set" for old employees without a salary.
    // Keep all 3 names (data, type, row) even if "row" is not used:
    // DataTables counts them, and only sends "type" when there are 3.
    4: (data, type, row) => {
      if (type !== "display") return data ?? ""; // "??" = use "" when there is no salary
      if (data === null) return <span className="salary-missing">Not set</span>;
      return <span>{formatMoney(data)}</span>;
    },

    // Column 5: monthly bonus as "$200.00" (grey "$0.00" when there is no bonus)
    5: (data, type, row) => {
      if (type !== "display") return data;
      return <span className={data === 0 ? "bonus-zero" : ""}>{formatMoney(data)}</span>;
    },

    // Column 7: status badge
    7: (data, type, row) => {
      if (type !== "display") return data;
      return (
        <span className={row.is_active ? "status-badge status-active" : "status-badge status-inactive"}>
          {row.status_text}
        </span>
      );
    },
  };

  // Column 8: the Edit and Deactivate/Activate buttons (admins only)
  if (isAdmin) {
    tableSlots[8] = (data, type, row) => {
      if (type !== "display") return "";
      return (
        <div className="action-buttons">
          <button className="edit-button" onClick={() => openEditForm(row)}>
            Edit
          </button>
          <button
            className={row.is_active ? "deactivate-button" : "activate-button"}
            onClick={() => setEmployeeToChangeStatus(row)}
          >
            {row.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      );
    };
  }

  return (
    <PageLayout>
      {/* Breadcrumb: shows where we are, e.g. "Home > Employees" */}
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-arrow">›</span>
        <span>Employees</span>
      </nav>

      <section className="table-card employees-page">
        <div className="table-card-header">
          <h1 className="table-card-title">Company Employees</h1>
          {!isLoading && !errorMessage && (
            <span className="table-count">{employeeList.length} employees in total</span>
          )}
        </div>

        {/* Toolbar: the status filter on the left, the Add button on the right */}
        <div className="table-toolbar">
          <select
            className="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Show employees by status"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All employees</option>
          </select>

          {isAdmin && (
            <button className="add-button" onClick={openAddForm}>
              + Add Employee
            </button>
          )}
        </div>

        {/* The green success message */}
        {successMessage && <div className="success-message">{successMessage}</div>}

        {/* Show ONE of these: loading, error, or the DataTable */}
        {isLoading ? (
          <p className="table-message">Loading employees...</p>
        ) : errorMessage ? (
          <p className="table-message table-error">{errorMessage}</p>
        ) : (
          // DataTables adds the search box, "Show X entries", the page info and the page buttons
          <DataTable
            className="data-table"
            data={tableRows}
            columns={tableColumns}
            options={tableSettings}
            slots={tableSlots}
          >
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Contact</th>
                <th>Base Salary</th>
                <th>Bonus</th>
                <th>Hire Date</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
          </DataTable>
        )}
      </section>

      {/* The Add / Edit popup (only shows when isFormOpen is true) */}
      {isFormOpen && (
        <EmployeeFormModal
          employeeToEdit={employeeBeingEdited}
          departmentSuggestions={departmentSuggestions}
          onClose={closeForm}
          onSaved={handleEmployeeSaved}
        />
      )}

      {/* The "Are you sure?" popup (only shows when an employee was chosen) */}
      {employeeToChangeStatus && (
        <ConfirmDialog
          title={employeeToChangeStatus.is_active ? "Deactivate employee" : "Activate employee"}
          message={
            employeeToChangeStatus.is_active
              ? `${employeeToChangeStatus.full_name} will be marked as inactive. Their data is kept, and you can activate them again later.`
              : `${employeeToChangeStatus.full_name} will be marked as active again.`
          }
          confirmButtonText={employeeToChangeStatus.is_active ? "Yes, deactivate" : "Yes, activate"}
          isDanger={employeeToChangeStatus.is_active}
          onConfirm={changeEmployeeStatus}
          onCancel={() => setEmployeeToChangeStatus(null)}
        />
      )}
    </PageLayout>
  );
}
