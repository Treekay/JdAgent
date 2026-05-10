import React from "react";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Mail,
  Sparkles
} from "lucide-react";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "resume", label: "Generate Resume", icon: FileText },
  { id: "cover", label: "Cover Letter & Email", icon: Mail },
  { id: "analysis", label: "Analysis & Coach", icon: BarChart3 }
];

export function SidebarNavigation({ activePage, onLogout, onPageChange, user }) {
  return (
    <aside className="sidebar">
      <div className="sidebarBrand">
        <span className="brandMark">
          <Sparkles size={18} />
        </span>
        <div>
          <strong>ApplyAgent</strong>
          <small>{user?.username || "Application workflow"}</small>
        </div>
      </div>

      <nav className="sidebarNav" aria-label="Primary">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={activePage === item.id ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => onPageChange(item.id)}
            >
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <button className="sidebarLogout" type="button" onClick={onLogout}>
        Logout
      </button>
    </aside>
  );
}
