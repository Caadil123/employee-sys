// One popup form for BOTH adding a new user and editing an existing user.
// - Add:  <UserFormModal userToEdit={null} ... />
// - Edit: <UserFormModal userToEdit={someUser} ... />

import { useState } from "react";
import { sendRequest } from "../../api";
import Modal from "../Modal/Modal";

// "onClose" closes the popup. "onSaved" runs after a successful save.
export default function UserFormModal({ userToEdit, onClose, onSaved }) {
  // If we got a user, we are editing. If not, we are adding.
  const isEditing = userToEdit !== null;

  // The form boxes. When editing, they start with the user's current details.
  const [fullName, setFullName] = useState(isEditing ? userToEdit.full_name : "");
  const [email, setEmail] = useState(isEditing ? userToEdit.email : "");
  const [role, setRole] = useState(isEditing ? userToEdit.role : "user");
  const [password, setPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Runs when the admin clicks "Save"
  async function handleSave(event) {
    // Stop the browser from reloading the page
    event.preventDefault();

    setErrorMessage("");
    setIsSaving(true);

    try {
      let savedUser;

      if (isEditing) {
        // EDIT: PUT /api/users/7
        // An empty password box means "keep the old password", so we send null
        savedUser = await sendRequest(`/api/users/${userToEdit.id}`, "PUT", {
          full_name: fullName,
          email: email,
          role: role,
          new_password: password === "" ? null : password,
        });
      } else {
        // ADD: POST /api/users
        savedUser = await sendRequest("/api/users", "POST", {
          full_name: fullName,
          email: email,
          role: role,
          password: password,
        });
      }

      // Tell the page it worked (it will reload the list and close the popup)
      onSaved(savedUser);
    } catch (saveError) {
      // Show the backend's reason, e.g. "email: Only Gmail addresses are allowed"
      setErrorMessage(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal title={isEditing ? "Edit User" : "Add New User"} onClose={onClose}>
      <form onSubmit={handleSave}>
        {errorMessage && <div className="modal-error">{errorMessage}</div>}

        <div className="form-field">
          <label htmlFor="full-name">Full name</label>
          <input
            id="full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="e.g. Ahmed Ali"
            minLength={2}
            maxLength={100}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="user-email">Email</label>
          <input
            id="user-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@gmail.com"
            required
          />
          <p className="field-hint">Only Gmail addresses are allowed.</p>
        </div>

        <div className="form-field">
          <label htmlFor="user-role">Role</label>
          <select id="user-role" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="user-password">{isEditing ? "New password" : "Password"}</label>
          <input
            id="user-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isEditing ? "Leave empty to keep the old password" : "At least 6 characters"}
            minLength={6}
            required={!isEditing} // the password is required only when adding
            autoComplete="new-password"
          />
        </div>

        <div className="modal-buttons">
          <button type="button" className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="save-button" disabled={isSaving}>
            {isSaving ? "Saving..." : isEditing ? "Save changes" : "Add user"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
