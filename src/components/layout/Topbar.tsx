import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getMiBolsa } from "../../services/bolsa";
import { ConfirmDialog } from "../ui/ConfirmDialog";

export function Topbar() {
  const { username, logout } = useAuth();
  const [avisoBolsaAbierta, setAvisoBolsaAbierta] = useState(false);
  const [verificando, setVerificando] = useState(false);

  // Chequeo fresco al momento del click (nunca cache del frontend) — el
  // backend sigue siendo la unica fuente de verdad de si la bolsa sigue
  // abierta.
  async function handleCerrarSesion() {
    setVerificando(true);
    try {
      const estado = await getMiBolsa();
      if (estado.sesion?.estado === "ABIERTA") {
        setAvisoBolsaAbierta(true);
        return;
      }
      await logout();
    } catch {
      // Si no se puede confirmar el estado de la bolsa, no se bloquea el
      // cierre de sesion por eso.
      await logout();
    } finally {
      setVerificando(false);
    }
  }

  return (
    <header className="topbar">
      <div />
      <div className="topbar-user">
        <span>{username}</span>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleCerrarSesion}
          disabled={verificando}
        >
          Cerrar sesión
        </button>
      </div>
      <ConfirmDialog
        open={avisoBolsaAbierta}
        title="Bolsa abierta"
        message="Tu Bolsa permanece abierta; podrás continuarla al volver a iniciar sesión."
        confirmLabel="Cerrar sesión"
        onCancel={() => setAvisoBolsaAbierta(false)}
        onConfirm={() => {
          setAvisoBolsaAbierta(false);
          void logout();
        }}
      />
    </header>
  );
}
