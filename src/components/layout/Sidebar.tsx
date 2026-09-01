import { useState } from "react";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/clientes", label: "Clientes", icon: "👥" },
  { to: "/movimientos", label: "Movimientos", icon: "🔀" },
  { to: "/alertas", label: "Alertas", icon: "🔔" },
  { to: "/oportunidades", label: "Oportunidades", icon: "💡" },
  { to: "/renovaciones", label: "Renovaciones", icon: "🔄" },
  { to: "/tareas", label: "Tareas", icon: "✅" },
  { to: "/reuniones", label: "Reuniones", icon: "📅" },
  { to: "/reportes", label: "Reportes", icon: "📈" },
  { to: "/configuracion", label: "Configuración", icon: "⚙️" },
];

const COLLAPSED_STORAGE_KEY = "pv_sidebar_collapsed";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // ignorar storage no disponible (ej. modo privado)
      }
      return next;
    });
  }

  return (
    <nav className={collapsed ? "sidebar collapsed" : "sidebar"}>
      <div className="sidebar-header">
        <div className="sidebar-brand">{collapsed ? "PV" : "Post Venta"}</div>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>
      <ul className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-link-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="sidebar-link-label">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
