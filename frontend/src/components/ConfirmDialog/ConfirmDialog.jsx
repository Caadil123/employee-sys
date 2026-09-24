// A popup that asks "Are you sure?" before doing something important.
// Example: <ConfirmDialog title="Deactivate user" message="..." onConfirm={...} onCancel={...} />

import { useState } from "react";
import Modal from "../Modal/Modal";

// "isDanger" makes the confirm button red (for actions like deactivate)
export default function ConfirmDialog({ title, message, confirmButtonText, isDanger, onConfirm, onCancel }) {
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Runs when the admin clicks the confirm button
  async function handleConfirm() {
    setErrorMessage("");
    setIsWorking(true);

    try {
      // Do the action (the page gives us this function)
      await onConfirm();
    } catch (actionError) {
      // Something went wrong: show why, and keep the popup open
      setErrorMessage(actionError.message);
      setIsWorking(false);
    }
  }

  return (
    <Modal title={title} onClose={onCancel}>
      {errorMessage && <div className="modal-error">{errorMessage}</div>}

      <p>{message}</p>

      <div className="modal-buttons">
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={isDanger ? "danger-button" : "save-button"}
          onClick={handleConfirm}
          disabled={isWorking}
        >
          {isWorking ? "Please wait..." : confirmButtonText}
        </button>
      </div>
    </Modal>
  );
}
