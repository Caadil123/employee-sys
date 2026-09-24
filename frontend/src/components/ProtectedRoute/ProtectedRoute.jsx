// This component guards pages that need a login.
// If nobody is logged in, it sends the visitor to the login page.

import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function ProtectedRoute({ children }) {
  const { currentUser, isCheckingLogin } = useAuth();

  // Still checking the saved token? Show a short message and wait.
  if (isCheckingLogin) {
    return <p style={{ padding: 40 }}>Loading...</p>;
  }

  // Nobody is logged in, so go to the login page.
  // "replace" means the Back button will not bring them back here.
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // The user is logged in, so show the page
  return children;
}
