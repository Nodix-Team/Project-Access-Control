import { NavLink } from "react-router-dom";

const menuItems = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/users", label: "User", icon: "👤" },
  { to: "/departments", label: "Department", icon: "🏢" },
  { to: "/controllers", label: "Controller", icon: "📡" },
  { to: "/doors", label: "Door", icon: "🚪" },
  { to: "/logs", label: "Access Logs", icon: "📜" },
];

export default function NavSidebar() {
  return (
    <nav className="flex h-full w-56 flex-col gap-1 border-r border-gray-200 bg-white p-4">
      <div className="mb-4 px-2 text-lg font-bold text-gray-900">Access Control</div>
      {menuItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            }`
          }
        >
          <span>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
