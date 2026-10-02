import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMiBolsa } from "../../services/bolsa";
import type { BolsaEstado } from "../../types/postventaCliente";
import { calcularContenidoPopupBolsa } from "../../utils/bolsaPopupContenido";
import { marcarPopupBolsaMostrado, yaSeMostroPopupBolsa } from "../../utils/bolsaPopupStorage";
import { BolsaEstadoPopup } from "./BolsaEstadoPopup";

// Montado una sola vez dentro de AppShell (que no se remonta en cada cambio
// de ruta, solo el <Outlet/> interno cambia) — asi el efecto de aca corre
// exactamente cuando se pidio: al cargar la app, al recuperar sesion, y de
// nuevo despues de un login nuevo (AppShell se monta recien cuando
// ProtectedRoute deja pasar, o sea justo despues de login/recuperar
// sesion). El backend (GET /api/bolsa) es siempre la fuente real del
// estado — esto nunca decide "abierta/cerrada" por su cuenta, solo decide
// si YA se le mostro el aviso al usuario en esta pestaña.
export function BolsaEstadoWatcher() {
  const { username } = useAuth();
  const navigate = useNavigate();
  const [estadoVisible, setEstadoVisible] = useState<BolsaEstado | null>(null);

  useEffect(() => {
    if (!username) return;
    if (yaSeMostroPopupBolsa(username)) return;
    let cancelado = false;
    getMiBolsa()
      .then((estado) => {
        if (cancelado) return;
        // Solo se marca "ya mostrado" cuando de verdad hay algo que
        // anunciar (sesion abierta o cerrada automaticamente) — si hoy no
        // hay nada que contar todavia, se vuelve a intentar en la proxima
        // carga en vez de "gastar" el aviso de esta sesion de navegador.
        if (!calcularContenidoPopupBolsa(estado)) return;
        marcarPopupBolsaMostrado(username);
        setEstadoVisible(estado);
      })
      .catch(() => {
        // Si falla la consulta no se muestra nada — no se inventa un
        // estado, y no se marca como "mostrado" para poder reintentar en
        // la proxima carga.
      });
    return () => {
      cancelado = true;
    };
  }, [username]);

  if (!estadoVisible) return null;

  return (
    <BolsaEstadoPopup
      estado={estadoVisible}
      onClose={() => setEstadoVisible(null)}
      onVerBolsa={() => {
        setEstadoVisible(null);
        navigate("/bolsa");
      }}
    />
  );
}
