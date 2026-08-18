import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { useAuth } from "../context/AuthContext";
import { getOrdenesServicio } from "../services/ordenes";

// Tamano de pagina grande para traer todas las ordenes de una vez (igual que
// el ejemplo original con displatyLength=1000000), en vez de limitar a un
// rango chico por defecto.
const PAGE_SIZE = 5000;

interface Filters {
  fechaInicio: string;
  fechaFin: string;
  plan: string;
  estado: string;
  search: string;
}

const DEFAULT_FILTERS: Filters = {
  fechaInicio: "2015-01-01",
  fechaFin: new Date().toISOString().slice(0, 10),
  plan: "ALL",
  estado: "ALL",
  search: "",
};

// La API externa puede devolver el listado en distintas formas
// (arreglo plano, o el patron tipico de DataTables server-side).
function extractRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const candidate = obj.data ?? obj.result ?? obj.items ?? obj.aaData;
    if (Array.isArray(candidate)) return candidate as Record<string, unknown>[];
  }
  return [];
}

function extractTotal(payload: unknown): number | null {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const total =
      obj.recordsFiltered ??
      obj.recordsTotal ??
      obj.iTotalDisplayRecords ??
      obj.iTotalRecords ??
      obj.total;
    if (typeof total === "number") return total;
  }
  return null;
}

export function OrdenesPage() {
  const { username, logout } = useAuth();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [displayStart, setDisplayStart] = useState(0);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  const fetchOrdenes = useCallback(
    async (currentFilters: Filters, start: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getOrdenesServicio({
          fechaInicio: currentFilters.fechaInicio,
          fechaFin: currentFilters.fechaFin,
          plan: currentFilters.plan,
          estado: currentFilters.estado,
          allFechas: 0,
          displayStart: start,
          displayLength: PAGE_SIZE,
          search: currentFilters.search,
        });
        setRows(extractRows(data));
        setTotal(extractTotal(data));
      } catch (err) {
        const message = isAxiosError(err)
          ? (err.response?.data as { message?: string } | undefined)?.message
          : undefined;
        setError(message ?? "No se pudo obtener el listado de ordenes de servicio");
        setRows([]);
        setTotal(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchOrdenes(filters, displayStart);
  }, [fetchOrdenes, filters, displayStart]);

  function handleFilterSubmit(event: React.FormEvent) {
    event.preventDefault();
    setDisplayStart(0);
    fetchOrdenes(filters, 0);
  }

  const hasNextPage = total === null ? rows.length === PAGE_SIZE : displayStart + PAGE_SIZE < total;

  return (
    <div className="ordenes-page">
      <header className="ordenes-header">
        <h1>Ordenes de servicio</h1>
        <div className="ordenes-user">
          <span>{username}</span>
          <button type="button" onClick={() => logout()}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <form className="ordenes-filters" onSubmit={handleFilterSubmit}>
        <label>
          Desde
          <input
            type="date"
            value={filters.fechaInicio}
            onChange={(e) => setFilters((f) => ({ ...f, fechaInicio: e.target.value }))}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={filters.fechaFin}
            onChange={(e) => setFilters((f) => ({ ...f, fechaFin: e.target.value }))}
          />
        </label>
        <label>
          Plan
          <input
            value={filters.plan}
            onChange={(e) => setFilters((f) => ({ ...f, plan: e.target.value }))}
          />
        </label>
        <label>
          Estado
          <input
            value={filters.estado}
            onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
          />
        </label>
        <label>
          Buscar
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="DNI, numero de orden, etc."
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="ordenes-table-wrapper">
        <table className="ordenes-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td key={col}>{String(row[col] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <p>No hay resultados para estos filtros.</p>}
      </div>

      <div className="ordenes-pagination">
        <button
          type="button"
          disabled={displayStart === 0 || loading}
          onClick={() => setDisplayStart((s) => Math.max(0, s - PAGE_SIZE))}
        >
          Anterior
        </button>
        <span>
          Mostrando desde {displayStart + 1}
          {total !== null ? ` de ${total}` : ""}
        </span>
        <button
          type="button"
          disabled={!hasNextPage || loading}
          onClick={() => setDisplayStart((s) => s + PAGE_SIZE)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
