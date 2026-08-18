import { useAuth } from "../../context/AuthContext";

export function Topbar() {
  const { username, logout } = useAuth();

  return (
    <header className="topbar">
      <div />
      <div className="topbar-user">
        <span>{username}</span>
        <button type="button" className="btn btn-ghost" onClick={() => logout()}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
