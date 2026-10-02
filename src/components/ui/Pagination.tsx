import "./ui.css";

// Ventana de paginas numeradas: siempre primera y ultima, mas 1 pagina a cada
// lado de la actual, con "…" en los huecos. Con pocas paginas (<=7) se
// muestran todas — no hace falta acortar nada.
function buildPageList(current: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < totalPages - 2) pages.push("...");
  pages.push(totalPages);
  return pages;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  itemLabel = "resultados",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  // Sustantivo para el rango ("1–10 de 57 oportunidades") — cada pantalla
  // dice que esta paginando, en vez de un "resultados" generico.
  itemLabel?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const pageList = buildPageList(page, totalPages);

  return (
    <nav className="pagination" aria-label="Paginación">
      <span className="pagination-range">
        {start}–{end} de {total} {itemLabel}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </button>

        <div className="pagination-numbers">
          {pageList.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="pagination-ellipsis" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={p === page ? "btn btn-primary" : "btn btn-secondary"}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Página ${p}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Solo visible en movil (ver ui.css) — reemplaza a los numeros,
            que ahi se ocultan por falta de espacio. */}
        <span className="pagination-current-label" aria-live="polite">
          Página {page} de {totalPages}
        </span>

        <button
          type="button"
          className="btn btn-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
