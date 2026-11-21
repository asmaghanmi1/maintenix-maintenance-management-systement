
import { Search, Bell, ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const pageTitles: Record<string, string> = {
  "/": "Maintenance Overview",
  "/equipment": "Equipment Management",
  "/interventions": "Intervention Management",
  "/spare-parts": "Spare Parts Management",
  "/reports": "Maintenance Reports",
  "/users": "User Management",
};

const roleLabels: Record<string, string> = {
  ADMIN: "Administrator",
  MAINTENANCE_MANAGER: "Maintenance Manager",
  TECHNICIAN: "Technician",
};

export default function Header() {
  const location = useLocation();
  const { user } = useAuth();

  const title = pageTitles[location.pathname] || "Maintenix";
  const fullName = user?.full_name || "User";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <header className="header">
      <div>
        <p className="breadcrumb">Workspace / {title}</p>
        <h1>{title}</h1>
      </div>

      <div className="header-actions">
        <div className="search-box">
          <Search size={18} />
          <input
            placeholder="Search anything..."
            aria-label="Search"
          />
          <span>⌘ K</span>
        </div>

        <button
          className="notification-button"
          type="button"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} />
        </button>

        <div className="profile">
          <div className="avatar">{initials || "U"}</div>

          <div className="profile-info">
            <strong>{fullName}</strong>
            <small>
              {user?.role
                ? roleLabels[user.role] || user.role
                : "User"}
            </small>
          </div>

          <ChevronDown size={16} />
        </div>
      </div>
    </header>
  );
}
