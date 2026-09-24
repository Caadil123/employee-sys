// This file decides which page to show for each address (route).

import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import EmployeesPage from "./pages/EmployeesPage/EmployeesPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import PayrollPage from "./pages/PayrollPage/PayrollPage";
import UsersPage from "./pages/UsersPage/UsersPage";

export default function App() {
  return (
    <Routes>
      {/* Anyone can open the login page */}
      <Route path="/login" element={<LoginPage />} />

      {/* The employees page is protected: you must be logged in */}
      <Route
        path="/employees"
        element={
          <ProtectedRoute>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />

      {/* The payroll page is protected: you must be logged in */}
      <Route
        path="/payroll"
        element={
          <ProtectedRoute>
            <PayrollPage />
          </ProtectedRoute>
        }
      />

      {/* The users page is protected: you must be logged in */}
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />

      {/* The home address "/" and any unknown address go to the employees page */}
      <Route path="*" element={<Navigate to="/employees" replace />} />
    </Routes>
  );
}
