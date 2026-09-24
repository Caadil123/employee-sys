// The purple bar at the top of every page (after login).

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import UserAvatar from "../UserAvatar/UserAvatar";
import "./TopBar.css";

// "onMenuClick" opens or closes the sidebar on small screens
export default function TopBar({ onMenuClick }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Forget the login, then go to the login page
  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="top-bar">
      {/* Left: menu button + app name (darker purple, same width as the sidebar) */}
      <div className="top-bar-brand">
        <button className="menu-button" onClick={onMenuClick} aria-label="Open or close the menu">
          ☰
        </button>
        <span className="brand-logo-small">E</span>
        <span className="brand-name-small">EmployeeMS</span>
      </div>

      {/* Right: the logged-in user and the logout button */}
      <div className="top-bar-user">
        <UserAvatar fullName={currentUser.full_name} size={36} />
        <span className="top-bar-user-name">{currentUser.full_name}</span>
        <button className="logout-button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}
