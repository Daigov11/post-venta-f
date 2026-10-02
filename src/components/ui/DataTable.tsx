import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";
import "./ui.css";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSortChange?: (key: string) => void;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: ReactNode;
  /** Fija la primera columna (pensada para el boton ⚙ de ActionMenu) para
      que quede visible al hacer scroll horizontal — ver ui.css .sticky-col. */
  stickyFirstColumn?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sortBy,
  sortDir,
  onSortChange,
  onRowClick,
  loading,
  emptyMessage,
  stickyFirstColumn,
}: DataTableProps<T>) {
  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, index) => {
              const isSorted = sortBy === col.key;
              const classNames = [
                col.sortable ? "sortable" : "",
                col.align ? `align-${col.align}` : "",
                stickyFirstColumn && index === 0 ? "sticky-col" : "",
              ]
                .filter(Boolean)
                .join(" ");
              if (!col.sortable) {
                return (
                  <th key={col.key} className={classNames}>
                    {col.label}
                  </th>
                );
              }
              return (
                <th key={col.key} className={classNames} aria-sort={isSorted ? (sortDir === "desc" ? "descending" : "ascending") : "none"}>
                  <button type="button" className="data-table-sort-btn" onClick={() => onSortChange?.(col.key)}>
                    {col.label}
                    {isSorted ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={`skeleton-${i}`}>
                {columns.map((col, index) => (
                  <td key={col.key} className={stickyFirstColumn && index === 0 ? "sticky-col" : ""}>
                    <Skeleton height={14} />
                  </td>
                ))}
              </tr>
            ))}

          {!loading &&
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? "clickable" : ""}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col, index) => (
                  <td
                    key={col.key}
                    className={[
                      col.align ? `align-${col.align}` : "",
                      stickyFirstColumn && index === 0 ? "sticky-col" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
      {!loading && rows.length === 0 && (
        <EmptyState title="Sin resultados" message={emptyMessage ?? "No hay datos para estos filtros."} />
      )}
    </div>
  );
}
