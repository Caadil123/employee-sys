// The Payroll page: shows all payroll records in a DataTable
// (with a search box, pagination and sorting).
// - Everyone logged in can generate payroll (ONE click for all active employees),
//   and edit (e.g. add a bonus) or delete PENDING payroll.
// - Only an admin can approve payroll.
// - Approved payroll is locked: no edit, no delete.
// (The API enforces all these rules too. The page only hides buttons that would not work.)

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DataTable from "datatables.net-react";
import { sendRequest } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import EditPayrollModal from "../../components/EditPayrollModal/EditPayrollModal";
import GeneratePayrollModal from "../../components/GeneratePayrollModal/GeneratePayrollModal";
import PageLayout from "../../components/PageLayout/PageLayout";
import UserAvatar from "../../components/UserAvatar/UserAvatar";
import { formatMoney, formatMonth } from "../../formatters";
import "../../styles/TablePage.css";
import "./PayrollPage.css";

export default function PayrollPage() {
  const { currentUser } = useAuth();

  // Only admins see the Approve button
  const isAdmin = currentUser.role === "admin";

  // The list of payroll records we get from the backend
  const [payrollList, setPayrollList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Which payrolls to show: "all", "pending" or "approved"
  const [statusFilter, setStatusFilter] = useState("all");

  // Is the one-click "Generate Payroll" popup open?
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  // The payroll being edited (null = the Edit popup is closed)
  const [payrollBeingEdited, setPayrollBeingEdited] = useState(null);

  // The "Are you sure?" popup for delete and approve:
  // null = closed, or { action: "delete" or "approve", payroll: the chosen payroll }
  const [pendingAction, setPendingAction] = useState(null);

  // A short green message after an action
  const [successMessage, setSuccessMessage] = useState("");

  // Load (or reload) all payroll records from the backend
  async function loadPayrolls() {
    try {
      const payrollsFromDatabase = await sendRequest("/api/payrolls");
      setPayrollList(payrollsFromDatabase);
      setErrorMessage("");
    } catch (loadError) {
      setErrorMessage(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  // When the page opens, load the payroll records one time
  useEffect(() => {
    loadPayrolls();
  }, []);

  // Show a green message, then hide it after 3 seconds
  function showSuccess(messageText) {
    setSuccessMessage(messageText);
    setTimeout(() => setSuccessMessage(""), 3000);
  }

  // ---------- Generate (one click) ----------

  // Runs after the Generate popup created the payrolls.
  // The popup stays open to show its summary; we just reload the table behind it.
  function handlePayrollsGenerated() {
    loadPayrolls();
  }

  // ---------- Edit (e.g. add a bonus) ----------

  // Runs after the Edit popup saved the payroll successfully
  function handlePayrollSaved(savedPayroll) {
    setPayrollBeingEdited(null); // close the popup
    showSuccess(
      `Payroll of ${savedPayroll.employee_name} for ${formatMonth(savedPayroll.pay_month)} was updated: ` +
        `total ${formatMoney(savedPayroll.total_salary)}`
    );
    loadPayrolls(); // get the fresh list from the database
  }

  // ---------- Delete and Approve ----------

  // Runs when the user clicks "Yes" in the "Are you sure?" popup
  async function doPendingAction() {
    const chosenPayroll = pendingAction.payroll;
    const monthName = formatMonth(chosenPayroll.pay_month);

    if (pendingAction.action === "delete") {
      // DELETE /api/payrolls/5
      await sendRequest(`/api/payrolls/${chosenPayroll.id}`, "DELETE");
      showSuccess(`Payroll of ${chosenPayroll.employee_name} for ${monthName} was deleted`);
    } else {
      // PATCH /api/payrolls/5/approve
      await sendRequest(`/api/payrolls/${chosenPayroll.id}/approve`, "PATCH");
      showSuccess(`Payroll of ${chosenPayroll.employee_name} for ${monthName} was approved`);
    }

    setPendingAction(null); // close the popup
    loadPayrolls();
  }

  // ---------- The rows for the DataTable ----------

  // useMemo: only rebuild the rows when the payrolls or the filter change.
  // (DataTables redraws the whole table every time it gets new rows.)
  const tableRows = useMemo(() => {
    return (
      payrollList
        // 1) Keep only the payrolls that match the status filter
        .filter((onePayroll) => statusFilter === "all" || onePayroll.status === statusFilter)
        // 2) Add ready-to-search texts, so the search box can find
        //    "September", "2026-09", the employee's department, "Pending"...
        .map((onePayroll) => ({
          ...onePayroll,
          employee_text: `${onePayroll.employee_name} ${onePayroll.employee_department}`,
          month_text: `${onePayroll.pay_month} ${formatMonth(onePayroll.pay_month)}`,
          status_text: onePayroll.status === "approved" ? "Approved" : "Pending",
        }))
    );
  }, [payrollList, statusFilter]);

  // Which field of each row goes in which column (same order as the <th> headers).
  // The Actions column has no data, and cannot be sorted or searched.
  const tableColumns = [
    { data: "id" },
    { data: "employee_text" },
    { data: "month_text" },
    { data: "base_salary" },
    { data: "bonus" },
    { data: "total_salary" },
    { data: "status_text" },
    { data: null, orderable: false, searchable: false },
  ];

  // DataTables settings
  const tableSettings = {
    pageLength: 10, // 10 payrolls per page
    lengthMenu: [5, 10, 25, 50], // choices for "Show X entries"
    order: [[0, "desc"]], // sort by ID, biggest first (newest payrolls on top)

    // Our own texts instead of the default English texts
    language: {
      search: "",
      searchPlaceholder: "Search payroll...",
      lengthMenu: "Show _MENU_ entries",
      info: "Showing _START_ to _END_ of _TOTAL_ payroll records",
      infoEmpty: "No payroll records to show",
      infoFiltered: "(filtered from _MAX_)",
      zeroRecords: "No matching payroll records found",
      emptyTable: "No payroll records to show",
    },
  };

  // Draw money columns as "$1,500.00". For search and sort we keep the plain number.
  function moneySlot(data, type) {
    if (type !== "display") return data;
    return <span>{formatMoney(data)}</span>;
  }

  // "Slots" draw our own React design inside a column (by column number).
  // Each slot gets (data, type, row):
  //  - type "display" = the cell the user SEES  -> we give our design
  //  - other types (search, sort)              -> we give plain text, so search and sort still work
  const tableSlots = {
    // Column 1: avatar + employee name, with the department under it
    1: (data, type, row) => {
      if (type !== "display") return data;
      return (
        <div className="name-cell">
          <UserAvatar fullName={row.employee_name} size={40} />
          <div>
            <div className="name-text">{row.employee_name}</div>
            <div className="department-text">{row.employee_department}</div>
          </div>
        </div>
      );
    },

    // Column 2: "September 2026" (sorting uses "2026-09 ...", so months sort in the right order)
    2: (data, type, row) => {
      if (type !== "display") return data;
      return <span>{formatMonth(row.pay_month)}</span>;
    },

    // Columns 3, 4 and 5: money
    3: (data, type, row) => moneySlot(data, type, row),
    4: (data, type, row) => moneySlot(data, type, row),
    5: (data, type, row) => {
      if (type !== "display") return data;
      return <strong>{formatMoney(data)}</strong>;
    },

    // Column 6: status badge (orange = pending, green = approved)
    6: (data, type, row) => {
      if (type !== "display") return data;
      return <span className={`status-badge status-${row.status}`}>{row.status_text}</span>;
    },

    // Column 7: the buttons
    7: (data, type, row) => {
      if (type !== "display") return "";

      // Approved payroll is locked: no buttons, just a note
      if (row.status === "approved") {
        return <span className="locked-label">🔒 Locked</span>;
      }

      // Pending payroll: Edit and Delete for everyone, Approve only for admins
      return (
        <div className="action-buttons">
          {isAdmin && (
            <button className="activate-button" onClick={() => setPendingAction({ action: "approve", payroll: row })}>
              Approve
            </button>
          )}
          <button className="edit-button" onClick={() => setPayrollBeingEdited(row)}>
            Edit
          </button>
          <button className="deactivate-button" onClick={() => setPendingAction({ action: "delete", payroll: row })}>
            Delete
          </button>
        </div>
      );
    },
  };

  // Totals for the small summary boxes above the table
  const pendingCount = payrollList.filter((onePayroll) => onePayroll.status === "pending").length;
  const approvedCount = payrollList.length - pendingCount;

  return (
    <PageLayout>
      {/* Breadcrumb: shows where we are, e.g. "Home > Payroll" */}
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-arrow">›</span>
        <span>Payroll</span>
      </nav>

      <section className="table-card payroll-page">
        <div className="table-card-header">
          <h1 className="table-card-title">Payroll Records</h1>
          {!isLoading && !errorMessage && (
            <span className="table-count">
              {pendingCount} pending · {approvedCount} approved
            </span>
          )}
        </div>

        {/* Toolbar: the status filter on the left, the Generate button on the right */}
        <div className="table-toolbar">
          <select
            className="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Show payroll by status"
          >
            <option value="all">All payroll</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>

          <button className="add-button" onClick={() => setIsGenerateOpen(true)}>
            + Generate Payroll
          </button>
        </div>

        {/* The green success message */}
        {successMessage && <div className="success-message">{successMessage}</div>}

        {/* Show ONE of these: loading, error, or the DataTable */}
        {isLoading ? (
          <p className="table-message">Loading payroll records...</p>
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
                <th>Employee</th>
                <th>Month</th>
                <th>Base Salary</th>
                <th>Bonus</th>
                <th>Total Salary</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
          </DataTable>
        )}
      </section>

      {/* The one-click Generate popup */}
      {isGenerateOpen && (
        <GeneratePayrollModal onClose={() => setIsGenerateOpen(false)} onGenerated={handlePayrollsGenerated} />
      )}

      {/* The Edit popup (only shows when a payroll was chosen) */}
      {payrollBeingEdited && (
        <EditPayrollModal
          payrollToEdit={payrollBeingEdited}
          onClose={() => setPayrollBeingEdited(null)}
          onSaved={handlePayrollSaved}
        />
      )}

      {/* The "Are you sure?" popup for delete and approve */}
      {pendingAction && (
        <ConfirmDialog
          title={pendingAction.action === "delete" ? "Delete payroll" : "Approve payroll"}
          message={
            pendingAction.action === "delete"
              ? `The payroll of ${pendingAction.payroll.employee_name} for ${formatMonth(pendingAction.payroll.pay_month)} will be deleted for good.`
              : `Approve ${formatMoney(pendingAction.payroll.total_salary)} for ${pendingAction.payroll.employee_name} (${formatMonth(pendingAction.payroll.pay_month)})?`
          }
          confirmButtonText={pendingAction.action === "delete" ? "Yes, delete" : "Yes, approve"}
          isDanger={pendingAction.action === "delete"}
          onConfirm={doPendingAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </PageLayout>
  );
}
