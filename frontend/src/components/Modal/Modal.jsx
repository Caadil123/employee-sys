// A popup window that shows on top of the page, with a dark background behind it.
// Use it like this:  <Modal title="Add User" onClose={closeFunction}> ...content... </Modal>

import { useEffect } from "react";
import "./Modal.css";

export default function Modal({ title, onClose, children }) {
  // Close the popup when the user presses the Escape key
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    // When the popup closes, stop listening for the Escape key
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    // Clicking the dark background closes the popup
    <div className="modal-background" onClick={onClose}>
      {/* stopPropagation: clicking INSIDE the box must not close it */}
      <div
        className="modal-box"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* The content we put inside the popup */}
        {children}
      </div>
    </div>
  );
}
