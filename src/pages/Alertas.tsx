import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AccionesClienteDrawer } from "../components/panels/AccionesClienteDrawer";
import { CrearIncidenciaDialog } from "../components/panels/CrearIncidenciaDialog";
import { TareaForm, type TareaFormValues } from "../components/forms/TareaForm";
import { ActionMenu } from "../components/ui/ActionMenu";
import { Badge } from "../components/ui/Badge";
import { ClienteCell } from "../components/ui/ClienteCell";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { Drawer } from "../components/ui/Drawer";
import { EmptyState } from "../components/ui/EmptyState";
import { FilterBar } from "../components/ui/FilterBar";
import { Pagination } from "../components/ui/Pagination";
import { SearchInput } from "../components/ui/SearchInput";
import { Skeleton } from "../components/ui/Skeleton";
import { NivelAlertaPill } from "../components/ui/StatusPill";
import { useAuth } from "../context/AuthContext";
import { useAlertas } from "../hooks/useAlertas";
import { marcarEstadoAlerta, reabrirAlerta } from "../services/alertas";
import { createTarea } from "../services/tareas";
import type { Alerta, NivelAlerta } from "../types/postventaCliente";
import { ESTADO_ALERTA_LABEL, ESTADO_ALERTA_TONE, TIPOS_ALERTA, getAlertaMeta, tipoAlertaLabel } from "../utils/alertaLabels";
import { AlertaDetalleDrawer } from "./alertas/AlertaDetalleDrawer";
import { AlertaMiniCard } from "./alertas/AlertaMiniCard";
import { buildAlertaMenuItems } from "./alertas/alertaMenuItems";
import { MarcarResueltaDialog } from "./alertas/MarcarResueltaDialog";
import "./Alertas.css";

const NIVEL_RANK: Record<NivelAlerta, number> = { CRITICAL: 3, WARNING: 2, INFO: 1 };
const PAGE_SIZE = 20;

function ordenarAlertas(alertas: Alerta[]): Alerta[] {
  return [...alertas].sort((a, b) => {
    const porNivel = NIVEL_RANK[b.nivel] - NIVEL_RANK[a.nivel];
    if (porNivel !== 0) return porNivel;
    return a.cliente.localeCompare(b.cliente);
  });
}

// Busqueda por cliente o RUC — sobre el conjunto ya filtrado por nivel/tipo/
// estado (que si va al backend), sin tocar el motor de alertas ni pedir una
// pagina server-side: la lista completa de una vista ya es manejable en
// memoria, lo que no era manejable era renderizar todas las tarjetas a la
// vez (de ahi la paginacion).
function filtrarPorBusqueda(alertas: Alerta[], busqueda: string): Alerta[] {
  const q = busqueda.trim().toLowerCase();
  if (!q) return alertas;
  return alertas.filter(
    (a) => a.nombreCliente.toLowerCase().includes(q) || a.cliente.toLowerCase().includes(q)
  );
}

export function AlertasPage() {
  // Deep-link desde el Panel principal (cola urgente) — ?tipo=ALTA_PENDIENTE
  // llega ya filtrado — o desde la ficha del cliente ("Ver todas las
  // alertas") — ?cliente=<numeroDocumentoCliente>. Solo se lee una vez al
  // montar; despues el filtro local manda, igual que el resto de la pagina.
  const [searchParams, setSearchParams] = useSearchParams();
  const { username } = useAuth();
  const [nivel, setNivel] = useState<NivelAlerta | "">("");
  const [tipo, setTipo] = useState(() => searchParams.get("tipo") ?? "");
  const [clienteFiltro, setClienteFiltro] = useState(() => searchParams.get("cliente") ?? "");
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState<"activas" | "resueltas">("activas");
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useAlertas({
    nivel: nivel || undefined,
    tipo: tipo || undefined,
    numeroDocumentoCliente: clienteFiltro || undefined,
    estado: vista === "resueltas" ? "RESUELTA" : undefined,
  });

  function cambiarFiltro<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function quitarFiltroCliente() {
    setClienteFiltro("");
    setPage(1);
    const next = new URLSearchParams(searchParams);
    next.delete("cliente");
    setSearchParams(next, { replace: true });
  }

  const [procesando, setProcesando] = useState<Set<string>>(new Set());
  const [detalleAlerta, setDetalleAlerta] = useState<Alerta | null>(null);
  const [resolverAlerta, setResolverAlerta] = useState<Alerta | null>(null);
  const [resolviendo, setResolviendo] = useState(false);
  const [agendarAlerta, setAgendarAlerta] = useState<Alerta | null>(null);
  const [incidenciaAlerta, setIncidenciaAlerta] = useState<Alerta | null>(null);
  const [incidenciaConfirmacion, setIncidenciaConfirmacion] = useState<{
    numero: string | null;
    message: string;
    cliente: string;
  } | null>(null);
  // Se bumpea al crear una incidencia con exito — se usa como parte del key
  // de AlertaTrazabilidad para forzar un refetch (esa lista es lazy, solo
  // fetchea al expandirse, asi que un remount es la forma mas simple de que
  // la proxima vez que se abra ya incluya la incidencia recien creada).
  const [trazaVersion, setTrazaVersion] = useState(0);

  function abrirDetalle(alerta: Alerta) {
    setDetalleAlerta(alerta);
  }

  function cerrarDetalle() {
    setDetalleAlerta(null);
  }

  const [tareaDrawerOpen, setTareaDrawerOpen] = useState(false);
  const [tareaAlertaActual, setTareaAlertaActual] = useState<Alerta | null>(null);
  const [tareaInicial, setTareaInicial] = useState<Partial<TareaFormValues>>({});
  const [savingTarea, setSavingTarea] = useState(false);

  function conProcesando<T>(id: string, fn: () => Promise<T>): Promise<T> {
    setProcesando((prev) => new Set(prev).add(id));
    return fn().finally(() => {
      setProcesando((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  async function handleMarcarVista(alerta: Alerta) {
    await conProcesando(alerta.id, () => marcarEstadoAlerta(alerta.id, alerta.cliente, "VISTA"));
    refetch();
  }

  async function handleReabrir(alerta: Alerta) {
    await conProcesando(alerta.id, () => reabrirAlerta(alerta.id));
    cerrarDetalle();
    refetch();
  }

  async function handleConfirmarResuelta(motivo: string) {
    if (!resolverAlerta) return;
    setResolviendo(true);
    try {
      await marcarEstadoAlerta(resolverAlerta.id, resolverAlerta.cliente, "RESUELTA", motivo);
      setResolverAlerta(null);
      cerrarDetalle();
      refetch();
    } finally {
      setResolviendo(false);
    }
  }

  // Reemplaza a las antiguas "Crear tarea de soporte"/"Escalar a Soporte" —
  // ambas terminaban en el mismo TareaForm con distinto texto/prioridad
  // prellenada, duplicando en la práctica una escalación que ahora se
  // resuelve generando una incidencia real (ver handleGenerarIncidencia).
  // Esta queda como la unica "Crear tarea" — una tarea interna de
  // seguimiento, no ligada a crear una incidencia externa en APIWorking.
  function handleCrearTareaSeguimiento(alerta: Alerta) {
    setDetalleAlerta(null);
    setTareaAlertaActual(alerta);
    setTareaInicial({
      titulo: `Seguimiento: ${alerta.titulo}`,
      descripcion: alerta.mensaje,
      responsable: username ?? "",
      prioridad: alerta.nivel === "CRITICAL" ? "ALTA" : "MEDIA",
      tipo: "SEGUIMIENTO",
    });
    setTareaDrawerOpen(true);
  }

  function handleGenerarIncidencia(alerta: Alerta) {
    setIncidenciaAlerta(alerta);
  }

  function handleIncidenciaCreada(alerta: Alerta, resultado: { numero: string | null; message: string }) {
    setIncidenciaConfirmacion({ numero: resultado.numero, message: resultado.message, cliente: alerta.cliente });
    setIncidenciaAlerta(null);
    setTrazaVersion((v) => v + 1);
  }

  async function handleSubmitTarea(values: TareaFormValues) {
    if (!tareaAlertaActual) return;
    setSavingTarea(true);
    try {
      await createTarea({
        numeroDocumentoCliente: tareaAlertaActual.cliente,
        idOrdenServicio: tareaAlertaActual.idOrdenServicio,
        tipo: values.tipo,
        origen: "ALERTA",
        origenEntidadTipo: "ALERTA",
        origenEntidadId: tareaAlertaActual.id,
        titulo: values.titulo,
        descripcion: values.descripcion || null,
        responsable: values.responsable,
        prioridad: values.prioridad,
        fechaVencimiento: values.fechaVencimiento || null,
      });
      setTareaDrawerOpen(false);
    } finally {
      setSavingTarea(false);
    }
  }

  // Mantiene el drawer abierto sincronizado con la fila real (ej. "Marcar
  // vista" no cambia de lista, solo el badge de estado — sin esto, el
  // drawer seguiria mostrando el estado viejo hasta cerrarlo y reabrirlo).
  useEffect(() => {
    if (!detalleAlerta) return;
    const actualizada = (data?.data ?? []).find((a) => a.id === detalleAlerta.id);
    if (actualizada && actualizada.estado !== detalleAlerta.estado) setDetalleAlerta(actualizada);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const alertasOrdenadas = useMemo(() => ordenarAlertas(data?.data ?? []), [data]);
  const alertasFiltradas = useMemo(() => filtrarPorBusqueda(alertasOrdenadas, busqueda), [alertasOrdenadas, busqueda]);
  const alertasPagina = useMemo(
    () => alertasFiltradas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [alertasFiltradas, page]
  );

  // Contador de severidad de lo que esta efectivamente visible con los
  // filtros de servidor (nivel/tipo/estado/cliente) — no incluye la busqueda
  // de texto, que es un refinamiento aparte sobre esa misma vista.
  const conteoPorNivel = useMemo(() => {
    const conteo = { CRITICAL: 0, WARNING: 0, INFO: 0 };
    for (const alerta of data?.data ?? []) conteo[alerta.nivel] += 1;
    return conteo;
  }, [data]);

  const menuHandlers = {
    onAgendar: setAgendarAlerta,
    onInvestigar: abrirDetalle,
    onGenerarIncidencia: handleGenerarIncidencia,
    onCrearTareaSeguimiento: handleCrearTareaSeguimiento,
    onMarcarVista: handleMarcarVista,
    onAbrirResolver: setResolverAlerta,
    onReabrir: handleReabrir,
  };

  const columns: DataTableColumn<Alerta>[] = useMemo(
    () => [
      {
        key: "acciones",
        label: "",
        align: "center",
        render: (a) => (
          <ActionMenu
            label={`Acciones para ${a.nombreCliente}`}
            items={buildAlertaMenuItems(a, menuHandlers)}
          />
        ),
      },
      {
        key: "criticidad",
        label: "Criticidad / tipo",
        render: (a) => (
          <div className="alertas-tabla-criticidad">
            <NivelAlertaPill nivel={a.nivel} />
            <span className="alertas-tabla-tipo">{tipoAlertaLabel(a.tipo)}</span>
          </div>
        ),
      },
      {
        key: "cliente",
        label: "Cliente / RUC",
        render: (a) => (
          <ClienteCell numeroDocumentoCliente={a.cliente} nombreCliente={a.nombreCliente} sistemas={a.sistemas} />
        ),
      },
      {
        key: "quepaso",
        label: "Qué pasó",
        render: (a) => <span className="alertas-tabla-clamp">{a.mensaje}</span>,
      },
      {
        key: "area",
        label: "Área sugerida",
        render: (a) => {
          const meta = getAlertaMeta(a.tipo);
          return <Badge tone={meta.area ? "local" : "pending"}>{meta.area ?? "Pendiente"}</Badge>;
        },
      },
      {
        key: "siguiente",
        label: "Siguiente acción",
        render: (a) => <span className="alertas-tabla-clamp">{getAlertaMeta(a.tipo).accionRecomendada}</span>,
      },
      {
        key: "estado",
        label: "Estado",
        render: (a) => <Badge tone={ESTADO_ALERTA_TONE[a.estado]}>{ESTADO_ALERTA_LABEL[a.estado]}</Badge>,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trazaVersion]
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Alertas</h1>
          <div className="page-header-subtitle">
            Bandeja de trabajo — identifica una alerta por su criticidad y área sugerida, e
            investígala para ver el detalle completo y actuar.
          </div>
        </div>
      </div>

      {incidenciaConfirmacion && (
        <div className="success-banner" role="status">
          <span>
            Incidencia {incidenciaConfirmacion.numero ? `#${incidenciaConfirmacion.numero}` : ""} creada —{" "}
            {incidenciaConfirmacion.message}.{" "}
            <Link className="btn-link-inline" to={`/clientes/${incidenciaConfirmacion.cliente}`}>
              Ver ficha del cliente
            </Link>
          </span>
          <button type="button" className="btn btn-ghost" onClick={() => setIncidenciaConfirmacion(null)}>
            Cerrar
          </button>
        </div>
      )}

      {clienteFiltro && (
        <div className="toolbar-row" aria-label="Filtro activo por cliente">
          <Badge tone="info">
            Filtrando por cliente: {data?.data[0]?.nombreCliente ?? clienteFiltro}
          </Badge>
          <button type="button" className="btn btn-ghost" onClick={quitarFiltroCliente}>
            Quitar filtro
          </button>
        </div>
      )}

      {!loading && (
        <div className="toolbar-row" aria-label="Conteo de alertas por severidad en esta vista">
          <Badge tone="critical">⚠ {conteoPorNivel.CRITICAL} crítica(s)</Badge>
          <Badge tone="warning">⚠ {conteoPorNivel.WARNING} advertencia(s)</Badge>
          <Badge tone="info">ℹ️ {conteoPorNivel.INFO} info</Badge>
        </div>
      )}

      <div className="toolbar-row">
        <button
          type="button"
          className={vista === "activas" ? "btn btn-primary" : "btn btn-secondary"}
          onClick={() => {
            setVista("activas");
            setPage(1);
          }}
        >
          Activas
        </button>
        <button
          type="button"
          className={vista === "resueltas" ? "btn btn-primary" : "btn btn-secondary"}
          onClick={() => {
            setVista("resueltas");
            setPage(1);
          }}
        >
          Resueltas
        </button>
      </div>

      <FilterBar>
        <div className="field">
          <label htmlFor="alertas-busqueda">Cliente o RUC</label>
          <SearchInput
            id="alertas-busqueda"
            value={busqueda}
            onChange={cambiarFiltro(setBusqueda)}
            placeholder="Buscar por nombre o RUC..."
          />
        </div>
        <div className="field">
          <label htmlFor="alertas-nivel">Nivel</label>
          <select
            id="alertas-nivel"
            value={nivel}
            onChange={(event) => cambiarFiltro(setNivel)(event.target.value as NivelAlerta | "")}
          >
            <option value="">Todos</option>
            <option value="CRITICAL">Crítico</option>
            <option value="WARNING">Advertencia</option>
            <option value="INFO">Info</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="alertas-tipo">Tipo</label>
          <select id="alertas-tipo" value={tipo} onChange={(event) => cambiarFiltro(setTipo)(event.target.value)}>
            <option value="">Todos</option>
            {TIPOS_ALERTA.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      {loading && !data && <Skeleton height={320} />}

      {!loading && data && alertasFiltradas.length === 0 && (
        <EmptyState
          title={
            vista === "resueltas" ? "No hay alertas resueltas para este filtro." : "No hay alertas para este filtro."
          }
        />
      )}

      {alertasFiltradas.length > 0 && (
        <>
          <div className="alertas-tabla-desktop">
            <div className="card">
              <DataTable columns={columns} rows={alertasPagina} rowKey={(a) => a.id} loading={loading} stickyFirstColumn />
            </div>
          </div>

          <div className="alertas-lista-movil">
            {alertasPagina.map((alerta) => (
              <AlertaMiniCard key={alerta.id} alerta={alerta} items={buildAlertaMenuItems(alerta, menuHandlers)} />
            ))}
          </div>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={alertasFiltradas.length}
            onPageChange={setPage}
            itemLabel="alertas"
          />
        </>
      )}

      <Drawer open={detalleAlerta !== null} onClose={cerrarDetalle} title="Detalle de la alerta" size="wide">
        {detalleAlerta && (
          <AlertaDetalleDrawer
            key={`${detalleAlerta.id}-${trazaVersion}`}
            alerta={detalleAlerta}
            procesando={procesando.has(detalleAlerta.id)}
            onMarcarVista={handleMarcarVista}
            onAbrirResolver={setResolverAlerta}
            onReabrir={handleReabrir}
            onGenerarIncidencia={handleGenerarIncidencia}
          />
        )}
      </Drawer>

      {resolverAlerta && (
        <MarcarResueltaDialog
          titulo={resolverAlerta.titulo}
          onClose={() => setResolverAlerta(null)}
          onConfirm={handleConfirmarResuelta}
          submitting={resolviendo}
        />
      )}

      <Drawer
        open={tareaDrawerOpen}
        onClose={() => setTareaDrawerOpen(false)}
        title={tareaAlertaActual ? `Tarea — ${tareaAlertaActual.nombreCliente}` : "Nueva tarea"}
      >
        <TareaForm
          initial={tareaInicial}
          onSubmit={handleSubmitTarea}
          onCancel={() => setTareaDrawerOpen(false)}
          submitting={savingTarea}
        />
      </Drawer>

      {agendarAlerta && (
        <AccionesClienteDrawer
          key={agendarAlerta.id}
          numeroDocumentoCliente={agendarAlerta.cliente}
          origen={{
            modulo: "ALERTAS",
            etiqueta: "Alertas",
            entidadTipo: "ALERTA",
            entidadId: agendarAlerta.id,
          }}
          onClose={() => setAgendarAlerta(null)}
        />
      )}

      {incidenciaAlerta && (
        <CrearIncidenciaDialog
          numeroDocumentoCliente={incidenciaAlerta.cliente}
          clienteInfo={{
            nombre: incidenciaAlerta.nombreCliente,
            ruc: incidenciaAlerta.cliente,
            ordenVigente: incidenciaAlerta.idOrdenServicio,
          }}
          tituloInicial={`Alerta: ${tipoAlertaLabel(incidenciaAlerta.tipo)}`}
          descripcionInicial={[
            `Qué pasó: ${incidenciaAlerta.mensaje}`,
            `Acción recomendada: ${getAlertaMeta(incidenciaAlerta.tipo).accionRecomendada}`,
            `Alerta relacionada: #${incidenciaAlerta.id}`,
          ].join("\n")}
          onClose={() => setIncidenciaAlerta(null)}
          onCreada={(resultado) => handleIncidenciaCreada(incidenciaAlerta, resultado)}
        />
      )}
    </div>
  );
}
