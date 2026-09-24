// The one-click "Generate Payroll" popup.
// The user only chooses a MONTH. The API then creates a pending payroll for EVERY active employee,
// using each employee's base salary, with a bonus of 0.
// After generating, the popup shows a summary: who got a payroll, and who was skipped and why.

import { useState } from "react";
import { sendRequest } from "../../api";
import { formatMoney, formatMonth } from "../../formatters";
import Modal from "../Modal/Modal";
import "./GeneratePayrollModal.css";

// This month as "2026-09" (in the user's own time zone). We cannot pay a future month.
function getThisMonthText() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // months start at 0, so we add 1
  return `${today.getFullYear()}-${month}`;
}

// "onGenerated" runs after a successful generation (the page reloads its list)
export default function GeneratePayrollModal({ onClose, onGenerated }) {
  const [payMonth, setPayMonth] = useState(getThisMonthText());

  // The answer from the API after generating (null = not generated yet)
  const [generateResult, setGenerateResult] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Runs when the user clicks "Generate"
  async function handleGenerate(event) {
    // Stop the browser from reloading the page
    event.preventDefault();

    setErrorMessage("");
    setIsGenerating(true);

    try {
      // POST /api/payrolls/generate  with only the month
      const answer = await sendRequest("/api/payrolls/generate", "POST", { pay_month: payMonth });

      // Keep the answer to show the summary, and tell the page to reload its list
      setGenerateResult(answer);
      onGenerated(answer);
    } catch (generateError) {
      setErrorMessage(generateError.message);
    } finally {
      setIsGenerating(false);
    }
  }

  // ---------- After generating: show the summary ----------
  if (generateResult) {
    const generatedCount = generateResult.generated_payrolls.length;

    // The sum of all new total salaries
    const generatedTotal = generateResult.generated_payrolls.reduce(
      (runningTotal, onePayroll) => runningTotal + onePayroll.total_salary,
      0
    );

    return (
      <Modal title={`Payroll for ${formatMonth(generateResult.pay_month)}`} onClose={onClose}>
        {/* Green box: how many were generated */}
        <div className="generate-summary generate-summary-success">
          <strong>{generatedCount}</strong> pending payroll{generatedCount === 1 ? "" : "s"} generated
          {generatedCount > 0 && <> · total {formatMoney(generatedTotal)}</>}
        </div>

        {/* Skipped because they already have this month's payroll */}
        {generateResult.skipped_already_generated.length > 0 && (
          <div className="generate-summary generate-summary-info">
            <strong>Already generated</strong> (skipped): {generateResult.skipped_already_generated.join(", ")}
          </div>
        )}

        {/* Skipped because their base salary is not set */}
        {generateResult.skipped_no_base_salary.length > 0 && (
          <div className="generate-summary generate-summary-warning">
            <strong>No base salary</strong> (skipped): {generateResult.skipped_no_base_salary.join(", ")}.
            <br />
            Set their salary on the Employees page, then click Generate again for this month.
          </div>
        )}

        <div className="modal-buttons">
          <button type="button" className="save-button" onClick={onClose}>
            Done
          </button>
        </div>
      </Modal>
    );
  }

  // ---------- Before generating: choose the month ----------
  return (
    <Modal title="Generate Payroll" onClose={onClose}>
      <form onSubmit={handleGenerate}>
        {errorMessage && <div className="modal-error">{errorMessage}</div>}

        <div className="form-field">
          <label htmlFor="generate-month">Month</label>
          <input
            id="generate-month"
            type="month"
            value={payMonth}
            onChange={(event) => setPayMonth(event.target.value)}
            max={getThisMonthText()} // no future months
            required
          />
        </div>

        <div className="modal-buttons">
          <button type="button" className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="save-button" disabled={isGenerating}>
            {isGenerating ? "Generating..." : `Generate for ${formatMonth(payMonth)}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
