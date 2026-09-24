// The popup to edit a PENDING payroll, mostly to add this month's bonus.
// The employee and the month cannot change. Only the base salary and the bonus.

import { useState } from "react";
import { sendRequest } from "../../api";
import { formatMoney, formatMonth } from "../../formatters";
import Modal from "../Modal/Modal";
import "./EditPayrollModal.css";

export default function EditPayrollModal({ payrollToEdit, onClose, onSaved }) {
  // The form boxes start with the payroll's current money
  const [baseSalary, setBaseSalary] = useState(String(payrollToEdit.base_salary));
  const [bonus, setBonus] = useState(String(payrollToEdit.bonus));

  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // A preview of the total while the user types.
  // (Only a preview! The API calculates the real total itself.)
  const previewTotal = (Number(baseSalary) || 0) + (Number(bonus) || 0);

  // Runs when the user clicks "Save changes"
  async function handleSave(event) {
    // Stop the browser from reloading the page
    event.preventDefault();

    setErrorMessage("");
    setIsSaving(true);

    try {
      // PUT /api/payrolls/5  (only the money; an empty bonus box means 0)
      const savedPayroll = await sendRequest(`/api/payrolls/${payrollToEdit.id}`, "PUT", {
        base_salary: baseSalary,
        bonus: bonus === "" ? "0" : bonus,
      });

      // Tell the page it worked (it will reload the list and close the popup)
      onSaved(savedPayroll);
    } catch (saveError) {
      // Show the API's reason, e.g. "Approved payroll cannot be edited"
      setErrorMessage(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal title="Edit Payroll" onClose={onClose}>
      <form onSubmit={handleSave}>
        {errorMessage && <div className="modal-error">{errorMessage}</div>}

        {/* Who and which month (cannot change) */}
        <div className="edit-payroll-who">
          <strong>{payrollToEdit.employee_name}</strong> · {formatMonth(payrollToEdit.pay_month)}
        </div>

        <div className="form-field">
          <label htmlFor="edit-base-salary">Base salary ($)</label>
          <input
            id="edit-base-salary"
            type="number"
            min="0.01"
            step="0.01" // allow cents, e.g. 1500.50
            value={baseSalary}
            onChange={(event) => setBaseSalary(event.target.value)}
            required
          />
          <p className="field-hint">Changes only this month. The employee's own salary stays the same.</p>
        </div>

        <div className="form-field">
          <label htmlFor="edit-bonus">Bonus for this month ($)</label>
          <input
            id="edit-bonus"
            type="number"
            min="0"
            step="0.01"
            value={bonus}
            onChange={(event) => setBonus(event.target.value)}
            placeholder="0"
            autoFocus // the cursor starts here, because adding a bonus is the usual reason to edit
          />
        </div>

        {/* Total salary = Base salary + Bonus (preview) */}
        <div className="payroll-total-preview">
          <span>Total salary</span>
          <strong>{formatMoney(previewTotal)}</strong>
        </div>

        <div className="modal-buttons">
          <button type="button" className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="save-button" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
