import { useEffect, useMemo, useState } from "react";
import { AccionesClienteDrawer, columnaAccionesCliente } from "../components/panels/AccionesClienteDrawer";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { CalendarioFecha } from "../components/ui/CalendarioFecha";
import { ClienteCell } from "../components/ui/ClienteCell";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { FilterBar } from "../components/ui/FilterBar";
import {
  asignarHorarioReunion,
  getDisponibilidad,
  getReuniones,
} from "../services/reuniones";
import type { EstadoReunion, ReunionConCliente } from "../types/postventaCliente";

const ESTADO_LABEL: Record<EstadoReunion, string> = {
  PROGRAMADA: "Programada",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
  EN_ESPERA: "En espera de horario",
};

const ESTADO_TONE: Record<EstadoReunion, BadgeTone> = {
  PROGRAMADA: "info",
  COMPLETADA: "success",
  CANCELADA: "neutral",
  EN_ESPERA: "warning",
};

const TIPOS_REUNION = [
  { value: "CAPACITACION", label: "Capacitación" },
  { value: "REFORZAMIENTO", label: "Reforzamiento" },
];

function AsignarHorarioDialog({
  fila,
  onClose,
  onAsignado,
}: {
  fila: ReunionConCliente;
  onClose: () => void;
  onAsignado: () => void;
}) {
  const { reunion } = fila;
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!fecha) {
      setSlots([]);
      return;
    }
    let cancelado = false;
    setLoadingSlots(true);
    getDisponibilidad({ ejecutivo: reunion.ejecutivo, fecha, modalidad: reunion.modalidad })
      .then((s) => {
        if (!cancelado) {
          setSlots(s);
          setHoraInicio((prev) => (s.includes(prev) ? prev : ""));
        }
      })
      .finally(() => {
        if (!cancelado) setLoadingSlots(false);
      });
    return () => {
      cancelado = true;
    };
  }, [fecha, reunion.ejecutivo, reunion.modalidad]);

  async function handleConfirmar() {
    if (!fecha || !horaInicio) return;
    setGuardando(true);
    setError(null);
    try {
      await asignarHorarioReunion(reunion.id, { fecha, horaInicio });
      onAsignado();
      onClose();
    } catch {
      setError("No se pudo asignar el horario — puede que se haya ocupado justo ahora.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="confirm-dialog-backdrop" onClick={onClose}>
      <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Asignar horario</h3>
        <p className="muted">
          {fila.cliente?.nombreCliente ?? reunion.numeroDocumentoCliente} — {reunion.tipoReunion} ·{" "}
          {reunion.ejecutivo} · {reunion.modalidad === "VIRTUAL" ? "Virtual" : "Presencial"}
        </p>
        {reunion.nota && <p className="muted">Disponibilidad indicada: {reunion.nota}</p>}
        <CalendarioFecha fecha={fecha} onSelect={setFecha} />
        <div className="field">
          <label htmlFor="asignar-hora">Horario disponible</label>
          <select
            id="asignar-hora"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            disabled={!fecha || loadingSlots || slots.length === 0}
          >
            <option value="">
              {!fecha
                ? "Elegí una fecha"
                : loadingSlots
                  ? "Buscando horarios..."
                  : slots.length === 0
                    ? "Sin horarios disponibles"
                    : "Elegí un horario"}
            </option>
            {slots.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!fecha || !horaInicio || guardando}
            onClick={handleConfirmar}
          >
            {guardando ? "Guardando..." : "Confirmar horario"}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildColumns(
  onAbrirAcciones: (numeroDocumentoCliente: string) => void,
  onAsignarHorario: (fila: ReunionConCliente) => void
): DataTableColumn<ReunionConCliente>[] {
  return [
    columnaAccionesCliente<ReunionConCliente>(
      (f) => f.reunion.numeroDocumentoCliente,
      onAbrirAcciones
    ),
    {
      key: "cliente",
      label: "Cliente",
      render: (f) =>
        f.cliente ? (
          <ClienteCell
            numeroDocumentoCliente={f.cliente.numeroDocumentoCliente}
            nombreCliente={f.cliente.nombreCliente}
            sistemas={f.cliente.sistemas}
          />
        ) : (
          f.reunion.numeroDocumentoCliente
        ),
    },
    {
      key: "tipo",
      label: "Tipo",
      render: (f) => f.reunion.tipoReunion ?? "Seguimiento",
    },
    {
      key: "fecha",
      label: "Fecha / hora",
      render: (f) =>
        f.reunion.estado === "EN_ESPERA" ? (
          <span className="muted">Sin asignar</span>
        ) : (
          `${f.reunion.fecha} ${f.reunion.horaInicio}–${f.reunion.horaFin}`
        ),
    },
    {
      key: "modalidad",
      label: "Modalidad",
      render: (f) => (f.reunion.modalidad === "VIRTUAL" ? "Virtual" : "Presencial"),
    },
    { key: "ejecutivo", label: "Asesor", render: (f) => f.reunion.ejecutivo },
    {
      key: "nota",
      label: "Nota / disponibilidad",
      render: (f) => f.reunion.nota ?? "—",
    },
    {
      key: "estado",
      label: "Estado",
      render: (f) => <Badge tone={ESTADO_TONE[f.reunion.estado]}>{ESTADO_LABEL[f.reunion.estado]}</Badge>,
    },
    {
      key: "accion",
      label: "",
      align: "center",
      render: (f) =>
        f.reunion.estado === "EN_ESPERA" || f.reunion.estado === "PROGRAMADA" ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={(event) => {
              event.stopPropagation();
              onAsignarHorario(f);
            }}
          >
            {f.reunion.estado === "EN_ESPERA" ? "Asignar horario" : "Reprogramar"}
          </button>
        ) : (
          <span className="muted">—</span>
        ),
    },
  ];
}

export function ReunionesPage() {
  const [estado, setEstado] = useState<EstadoReunion | "">("EN_ESPERA");
  const [tipoReunion, setTipoReunion] = useState("");
  const [data, setData] = useState<{ data: ReunionConCliente[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  const [filaParaHorario, setFilaParaHorario] = useState<ReunionConCliente | null>(null);

  function cargar() {
    setLoading(true);
    getReuniones({
      estado: estado || undefined,
      tipoReunion: tipoReunion || undefined,
    })
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, tipoReunion]);

  const columns = useMemo(
    () => buildColumns(setClienteSeleccionado, setFilaParaHorario),
    []
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reuniones</h1>
          <div className="page-header-subtitle">
            Toda la cartera — incluye las reuniones especiales "en espera de horario" que se
            registran desde la ficha del cliente.
          </div>
        </div>
      </div>

      <FilterBar>
        <div className="field">
          <label htmlFor="reuniones-estado">Estado</label>
          <select
            id="reuniones-estado"
            value={estado}
            onChange={(event) => setEstado(event.target.value as EstadoReunion | "")}
          >
            <option value="">Todos</option>
            {Object.entries(ESTADO_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="reuniones-tipo">Tipo</label>
          <select
            id="reuniones-tipo"
            value={tipoReunion}
            onChange={(event) => setTipoReunion(event.target.value)}
          >
            <option value="">Todos</option>
            {TIPOS_REUNION.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      <div className="card">
        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(f) => f.reunion.id}
          loading={loading}
          emptyMessage="No hay reuniones para este filtro."
        />
      </div>

      {clienteSeleccionado && (
        <AccionesClienteDrawer
          key={clienteSeleccionado}
          numeroDocumentoCliente={clienteSeleccionado}
          onClose={() => setClienteSeleccionado(null)}
        />
      )}

      {filaParaHorario && (
        <AsignarHorarioDialog
          fila={filaParaHorario}
          onClose={() => setFilaParaHorario(null)}
          onAsignado={cargar}
        />
      )}
    </div>
  );
}
