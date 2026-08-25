import { MiniModulosClientes } from "../components/panels/MiniModulosClientes";

export function MovimientosPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Movimientos</h1>
          <div className="page-header-subtitle">
            Clientes nuevos, suspendidos por falta de pago y dados de baja
          </div>
        </div>
      </div>

      <MiniModulosClientes />
    </div>
  );
}
