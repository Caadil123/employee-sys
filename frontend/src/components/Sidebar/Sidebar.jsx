// The white menu on the left side of every page (after login).

import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import UserAvatar from "../UserAvatar/UserAvatar";
import "./Sidebar.css";

// "isOpen" is only used on small screens, where the sidebar slides in and out
// "onLinkClick" closes the sidebar after choosing a page (on small screens)
export default function Sidebar({ isOpen, onLinkClick }) {
  const { currentUser } = useAuth();

  return (
    <aside className={isOpen ? "sidebar is-open" : "sidebar"}>
      {/* The logged-in user at the top of the menu */}
      <div className="sidebar-profile">
        <UserAvatar fullName={currentUser.full_name} size={48} />
        <div>
          <div className="sidebar-profile-name">{currentUser.full_name}</div>
          <div className="sidebar-profile-role">{currentUser.role}</div>
        </div>
      </div>

      <div className="sidebar-section-title">Your Company</div>

      {/* NavLink adds the class "active" when we are on its page, so it gets highlighted */}
      <NavLink to="/employees" className="sidebar-link" onClick={onLinkClick}>
        <span className="sidebar-link-icon">🧑‍💼</span>
        Employees
      </NavLink>

      <NavLink to="/payroll" className="sidebar-link" onClick={onLinkClick}>
        <span className="sidebar-link-icon">💰</span>
        Payroll
      </NavLink>

      <NavLink to="/users" className="sidebar-link" onClick={onLinkClick}>
        <span className="sidebar-link-icon">👥</span>
        Users
      </NavLink>
    </aside>
  );
}
