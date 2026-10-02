import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { RolUsuario } from "../../services/auth";

const NAV_ITEMS: { to: string; label: string; icon: string; roles?: RolUsuario[] }[] = [
  { to: "/dashboard", label: "Dashboard", icon: "📊", roles: ["ADMIN", "ADMINISTRATIVO"] },
  { to: "/clientes", label: "Clientes", icon: "👥" },
  { to: "/alertas", label: "Alertas", icon: "🔔" },
  { to: "/oportunidades", label: "Oportunidades", icon: "💡" },
  { to: "/renovaciones", label: "Renovaciones", icon: "🔄", roles: ["ADMIN", "ADMINISTRATIVO"] },
  { to: "/tareas", label: "Tareas", icon: "✅" },
  { to: "/recuperacion", label: "Recuperación", icon: "♻️" },
  { to: "/bolsa", label: "La Bolsa", icon: "🧾", roles: ["ADMIN", "ADMINISTRATIVO"] },
  { to: "/reuniones", label: "Reuniones", icon: "📅" },
  { to: "/reportes", label: "Reportes", icon: "📈", roles: ["ADMIN", "ADMINISTRATIVO"] },
  { to: "/configuracion", label: "Configuración", icon: "⚙️", roles: ["ADMIN", "ADMINISTRATIVO"] },
];

// Seccion secundaria "Más" — funciones que se mantienen accesibles pero ya
// no compiten por espacio en el menu principal (ver ajuste funcional Fase 3:
// "Movimientos" no se elimina, solo se saca de la navegacion principal).
const NAV_ITEMS_SECUNDARIOS: { to: string; label: string; icon: string; roles?: RolUsuario[] }[] = [
  { to: "/movimientos", label: "Movimientos", icon: "🔀", roles: ["ADMIN", "ADMINISTRATIVO"] },
];

const COLLAPSED_STORAGE_KEY = "pv_sidebar_collapsed";
const MAS_ABIERTO_STORAGE_KEY = "pv_sidebar_mas_abierto";

export function Sidebar() {
  const { rol } = useAuth();
  const location = useLocation();

  const navItemsVisibles = NAV_ITEMS.filter((item) => !item.roles || (rol && item.roles.includes(rol)));
  const navSecundariosVisibles = NAV_ITEMS_SECUNDARIOS.filter(
    (item) => !item.roles || (rol && item.roles.includes(rol))
  );

  const enSeccionSecundaria = navSecundariosVisibles.some((item) => location.pathname.startsWith(item.to));

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  // Si se entra directo a /movimientos (link externo, recarga de pagina),
  // el grupo "Más" arranca abierto para que el link activo no quede
  // escondido — despues el usuario controla el toggle a mano.
  const [masAbierto, setMasAbierto] = useState(() => {
    if (enSeccionSecundaria) return true;
    try {
      return localStorage.getItem(MAS_ABIERTO_STORAGE_KEY) === "true";
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

  function toggleMas() {
    setMasAbierto((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MAS_ABIERTO_STORAGE_KEY, String(next));
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
        {navItemsVisibles.map((item) => (
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
        {navSecundariosVisibles.length > 0 && (
          <li>
            <button
              type="button"
              className="sidebar-link sidebar-more-toggle"
              onClick={toggleMas}
              title={collapsed ? "Más" : undefined}
              aria-expanded={masAbierto}
            >
              <span className="sidebar-link-icon" aria-hidden="true">
                ⋯
              </span>
              <span className="sidebar-link-label">Más</span>
              {!collapsed && (
                <span className="sidebar-more-caret" aria-hidden="true">
                  {masAbierto ? "▲" : "▼"}
                </span>
              )}
            </button>
          </li>
        )}
        {masAbierto &&
          navSecundariosVisibles.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => "sidebar-link sidebar-link-secundario" + (isActive ? " active" : "")}
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
