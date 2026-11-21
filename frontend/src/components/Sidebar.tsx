
import {
  LayoutDashboard,
  Settings,
  Wrench,
  Package,
  ChartNoAxesCombined,
  Users,
  LogOut,
  Activity,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Equipment", icon: Settings, path: "/equipment" },
  { label: "Interventions", icon: Wrench, path: "/interventions" },
  { label: "Spare Parts", icon: Package, path: "/spare-parts" },
  { label: "Reports", icon: ChartNoAxesCombined, path: "/reports" },
  { label: "Users", icon: Users, path: "/users" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Activity size={23} />
        </div>

        <div>
          <h2>Maintenix</h2>
          <span>Management System</span>
        </div>
      </div>

      <div className="menu-label">MAIN MENU</div>

      <nav className="nav-menu">
        {menuItems
          .filter((item) => item.path !== "/users" || user?.role === "ADMIN")
          .map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </nav>

      <div className="sidebar-bottom">
        <div className="system-status">
          <span className="status-dot" />
          System operational
        </div>

        <button
          className="nav-item"
          type="button"
          onClick={handleLogout}
        >
          <LogOut size={19} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
