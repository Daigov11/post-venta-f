import { Link } from "react-router-dom";
import { SistemasBadges } from "./SistemasBadges";
import type { ClienteSistemas } from "../../types/postventaCliente";
import "./ui.css";

// Cliente + RUC apilados (en vez de dos columnas separadas) con los iconos
// de sistemas debajo — usado en toda tabla que lista clientes, para que el
// nombre/RUC no empujen el resto de columnas tan lejos hacia la derecha.
export function ClienteCell({
  numeroDocumentoCliente,
  nombreCliente,
  sistemas,
}: {
  numeroDocumentoCliente: string;
  nombreCliente: string;
  sistemas: ClienteSistemas | null | undefined;
}) {
  return (
    <div className="cliente-cell">
      <Link className="cliente-cell-nombre" to={`/clientes/${numeroDocumentoCliente}`}>
        {nombreCliente}
      </Link>
      <span className="cliente-cell-ruc">{numeroDocumentoCliente}</span>
      <SistemasBadges sistemas={sistemas} />
    </div>
  );
}
