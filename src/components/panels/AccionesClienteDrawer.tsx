import { InteresesReunionesPanel } from "./InteresesReunionesPanel";
import type { DataTableColumn } from "../ui/DataTable";
import { Drawer } from "../ui/Drawer";
import { Skeleton } from "../ui/Skeleton";
import { useCliente } from "../../hooks/useCliente";

// Columna reutilizable para cualquier DataTable de clientes — cada tabla solo
// necesita decir como sacar el numeroDocumentoCliente de su fila.
export function columnaAccionesCliente<T>(
  getNumeroDocumento: (row: T) => string,
  onAbrir: (numeroDocumentoCliente: string) => void
): DataTableColumn<T> {
  return {
    key: "acciones",
    label: "Acciones",
    align: "center",
    render: (row) => (
      <button
        type="button"
        className="btn btn-secondary"
        onClick={(event) => {
          event.stopPropagation();
          onAbrir(getNumeroDocumento(row));
        }}
      >
        Agendar / Interés
      </button>
    ),
  };
}

// Drawer de "Agendar / Interés" compartido por toda pantalla que liste
// clientes (Clientes, Alertas, Renovaciones, Movimientos, Oportunidades) —
// fetchea la ficha recien al abrir (no de antemano para toda la lista), se
// monta/desmonta con key={numeroDocumentoCliente} en el llamador asi que
// cada apertura arranca su propio fetch.
export function AccionesClienteDrawer({
  numeroDocumentoCliente,
  onClose,
}: {
  numeroDocumentoCliente: string;
  onClose: () => void;
}) {
  const { data, loading, error, refetch } = useCliente(numeroDocumentoCliente);

  return (
    <Drawer open onClose={onClose} title={data ? data.cliente.nombreCliente : "Cliente"}>
      {loading && !data && <Skeleton height={220} />}
      {error && <p className="error-text">{error}</p>}
      {data && (
        <InteresesReunionesPanel
          numeroDocumentoCliente={data.cliente.numeroDocumentoCliente}
          idOrdenServicio={data.cliente.ordenVigente.idOrdenServicio}
          ejecutivoDefault={data.cliente.ordenVigente.ejecutivo}
          telefono={data.cliente.telefonoEfectivo}
          telefonoManual={data.cliente.telefonoManual}
          catalogo={data.intereses.catalogo}
          marcados={data.intereses.marcados}
          reuniones={data.reuniones}
          onChanged={refetch}
        />
      )}
    </Drawer>
  );
}
