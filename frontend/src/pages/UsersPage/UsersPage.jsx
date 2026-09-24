// The Users page: shows all users from the database in a DataTable
// (with a search box, pagination and sorting).
// Admins can also add, edit, deactivate (soft-delete) and activate users.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DataTable from "datatables.net-react";
import { sendRequest } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import PageLayout from "../../components/PageLayout/PageLayout";
import UserAvatar from "../../components/UserAvatar/UserAvatar";
import UserFormModal from "../../components/UserFormModal/UserFormModal";
import "../../styles/TablePage.css";
import "./UsersPage.css";

export default function UsersPage() {
  const { currentUser } = useAuth();

  // Only admins see the Add / Edit / Deactivate buttons
  const isAdmin = currentUser.role === "admin";

  // The list of users we get from the backend
  const [userList, setUserList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Which users to show: "all", "active" or "inactive"
  const [statusFilter, setStatusFilter] = useState("all");

  // The Add / Edit popup:
  // isFormOpen = is the popup open?  userBeingEdited = null when adding, a user when editing
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [userBeingEdited, setUserBeingEdited] = useState(null);

  // The user we are about to deactivate or activate (null = no "Are you sure?" popup)
  const [userToChangeStatus, setUserToChangeStatus] = useState(null);

  // A short green message after an action, e.g. "User added"
  const [successMessage, setSuccessMessage] = useState("");

  // Load (or reload) all users from the backend
  async function loadUsers() {
    try {
      const usersFromDatabase = await sendRequest("/api/users");
      setUserList(usersFromDatabase);
      setErrorMessage("");
    } catch (loadError) {
      setErrorMessage(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  // When the page opens, load the users one time
  useEffect(() => {
    loadUsers();
  }, []);

  // Show a green message, then hide it after 3 seconds
  function showSuccess(messageText) {
    setSuccessMessage(messageText);
    setTimeout(() => setSuccessMessage(""), 3000);
  }

  // ---------- Add and Edit ----------

  function openAddForm() {
    setUserBeingEdited(null); // null = we are adding a new user
    setIsFormOpen(true);
  }

  function openEditForm(oneUser) {
    setUserBeingEdited(oneUser); // the user we want to change
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setUserBeingEdited(null);
  }

  // Runs after the popup saved the user successfully
  function handleUserSaved(savedUser) {
    const wasEditing = userBeingEdited !== null;
    closeForm();
    showSuccess(wasEditing ? `${savedUser.full_name} was updated` : `${savedUser.full_name} was added`);
    loadUsers(); // get the fresh list from the database
  }

  // ---------- Deactivate and Activate ----------

  // Runs when the admin clicks "Yes" in the "Are you sure?" popup
  async function changeUserStatus() {
    // Active users get deactivated, inactive users get activated
    const actionName = userToChangeStatus.is_active ? "deactivate" : "activate";

    // PATCH /api/users/7/deactivate   or   PATCH /api/users/7/activate
    const changedUser = await sendRequest(`/api/users/${userToChangeStatus.id}/${actionName}`, "PATCH");

    setUserToChangeStatus(null); // close the popup
    showSuccess(`${changedUser.full_name} is now ${changedUser.is_active ? "active" : "inactive"}`);
    loadUsers();
  }

  // ---------- The rows for the DataTable ----------

  // useMemo: only rebuild the rows when the users or the filter change.
  // (DataTables redraws the whole table every time it gets new rows.)
  const tableRows = useMemo(() => {
    return (
      userList
        // 1) Keep only the users that match the status filter
        .filter((oneUser) => {
          if (statusFilter === "active") return oneUser.is_active;
          if (statusFilter === "inactive") return !oneUser.is_active;
          return true; // "all"
        })
        // 2) Add two ready-to-show texts, so the search box can find them too
        .map((oneUser) => ({
          ...oneUser,
          status_text: oneUser.is_active ? "Active" : "Inactive",
          created_date: oneUser.created_at.slice(0, 10), // "2026-09-24T14:40:00" -> "2026-09-24"
        }))
    );
  }, [userList, statusFilter]);

  // Which field of each row goes in which column (same order as the <th> headers)
  const tableColumns = [
    { data: "id" },
    { data: "full_name" },
    { data: "email" },
    { data: "role" },
    { data: "status_text" },
    { data: "created_date" },
  ];

  // The Actions column: only for admins. It has no data, and cannot be sorted or searched.
  if (isAdmin) {
    tableColumns.push({ data: null, orderable: false, searchable: false });
  }

  // DataTables settings
  const tableSettings = {
    pageLength: 10, // 10 users per page
    lengthMenu: [5, 10, 25, 50], // choices for "Show X entries"
    order: [[0, "desc"]], // sort by ID, biggest first (newest users on top)

    // Give inactive users a faded row
    createdRow: (rowElement, rowData) => {
      if (!rowData.is_active) {
        rowElement.classList.add("inactive-row");
      }
    },

    // Our own texts instead of the default English texts
    language: {
      search: "",
      searchPlaceholder: "Search users...",
      lengthMenu: "Show _MENU_ entries",
      info: "Showing _START_ to _END_ of _TOTAL_ users",
      infoEmpty: "No users to show",
      infoFiltered: "(filtered from _MAX_)",
      zeroRecords: "No matching users found",
      emptyTable: "No users to show",
    },
  };

  // "Slots" draw our own React design inside a column (by column number).
  // Each slot gets (data, type, row):
  //  - type "display" = the cell the user SEES  -> we give our design
  //  - other types (search, sort)              -> we give plain text, so search and sort still work
  const tableSlots = {
    // Column 1: avatar + name
    1: (data, type, row) => {
      if (type !== "display") return data;
      return (
        <div className="name-cell">
          <UserAvatar fullName={row.full_name} size={40} />
          <span className="name-text">{row.full_name}</span>
        </div>
      );
    },

    // Column 3: role badge
    3: (data, type, row) => {
      if (type !== "display") return data;
      return <span className={`role-badge role-${row.role}`}>{row.role}</span>;
    },

    // Column 4: status badge
    4: (data, type, row) => {
      if (type !== "display") return data;
      return (
        <span className={row.is_active ? "status-badge status-active" : "status-badge status-inactive"}>
          {row.status_text}
        </span>
      );
    },
  };

  // Column 6: the Edit and Deactivate/Activate buttons (admins only)
  if (isAdmin) {
    tableSlots[6] = (data, type, row) => {
      if (type !== "display") return "";
      return (
        <div className="action-buttons">
          <button className="edit-button" onClick={() => openEditForm(row)}>
            Edit
          </button>

          {/* The admin cannot deactivate themselves, so we show "You" instead */}
          {row.id === currentUser.id ? (
            <span className="you-label">You</span>
          ) : (
            <button
              className={row.is_active ? "deactivate-button" : "activate-button"}
              onClick={() => setUserToChangeStatus(row)}
            >
              {row.is_active ? "Deactivate" : "Activate"}
            </button>
          )}
        </div>
      );
    };
  }

  return (
    <PageLayout>
      {/* Breadcrumb: shows where we are, e.g. "Home > Users" */}
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-arrow">›</span>
        <span>Users</span>
      </nav>

      <section className="table-card users-page">
        <div className="table-card-header">
          <h1 className="table-card-title">Company Users</h1>
          {!isLoading && !errorMessage && <span className="table-count">{userList.length} users in total</span>}
        </div>

        {/* Toolbar: the status filter on the left, the Add button on the right */}
        <div className="table-toolbar">
          <select
            className="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Show users by status"
          >
            <option value="all">All users</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {isAdmin && (
            <button className="add-button" onClick={openAddForm}>
              + Add User
            </button>
          )}
        </div>

        {/* The green success message */}
        {successMessage && <div className="success-message">{successMessage}</div>}

        {/* Show ONE of these: loading, error, or the DataTable */}
        {isLoading ? (
          <p className="table-message">Loading users...</p>
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
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created Date</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
          </DataTable>
        )}
      </section>

      {/* The Add / Edit popup (only shows when isFormOpen is true) */}
      {isFormOpen && (
        <UserFormModal userToEdit={userBeingEdited} onClose={closeForm} onSaved={handleUserSaved} />
      )}

      {/* The "Are you sure?" popup (only shows when a user was chosen) */}
      {userToChangeStatus && (
        <ConfirmDialog
          title={userToChangeStatus.is_active ? "Deactivate user" : "Activate user"}
          message={
            userToChangeStatus.is_active
              ? `${userToChangeStatus.full_name} will not be able to log in. Their data is kept, and you can activate them again later.`
              : `${userToChangeStatus.full_name} will be able to log in again.`
          }
          confirmButtonText={userToChangeStatus.is_active ? "Yes, deactivate" : "Yes, activate"}
          isDanger={userToChangeStatus.is_active}
          onConfirm={changeUserStatus}
          onCancel={() => setUserToChangeStatus(null)}
        />
      )}
    </PageLayout>
  );
}
