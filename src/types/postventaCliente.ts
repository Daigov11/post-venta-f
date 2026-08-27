// Espejo manual: backend/src/types/postventa.ts debe mantenerse alineado con este archivo.

export type EstadoPostVenta = "NORMAL" | "REVISAR" | "ATENCION";
export type SegmentoCartera = "DIAMANTE" | "ORO" | "PLATA" | "CRITICO";
export type Periodicidad =
  | "MENSUAL"
  | "TRIMESTRAL"
  | "SEMESTRAL"
  | "ANUAL"
  | "DESCONOCIDO";
export type NivelAlerta = "INFO" | "WARNING" | "CRITICAL";

export interface PagoNormalizado {
  nroComprobante: string;
  fechaEmitido: string | null;
  total: number;
  deuda: number;
  origen: string;
}

// De GET /Administrativo/post-venta — endpoint separado, requiere rol
// _SISTEMAS. Se cruza con orden-servicio por idOrdenServicio en el sync
// diario del backend; null si esa OS es anterior al rango util del endpoint
// (25-09-2022) o no aparecio en el pull.
export interface PostVentaExtra {
  idSistema: number | null;
  nSistema: string | null;
  nombreComercial: string | null;
  fechaActivacion: string | null;
  nCicloFacturacion: string | null;
  nEstadoSistema: string | null;
  nEstadoSunat: string | null;
  nEstadoCapacitado: string | null;
  nAfiliadoSunat: string | null;
  nModo: string | null;
  visualizarSunat: boolean;
  suspendido: boolean;
  acargo: string | null;
  fechaVencimientoCertificado: string | null;
  fechaInactivo: string | null;
  cantidadComprobantesMensual: number;
  comprobantesMensualDesglose: { bv: number; fv: number; nv: number; otros: number };
  ingresosClienteMensual: number | null;
  instalado: boolean;
  meses: number | null;
  fechaInstalacion: string | null;
}

export interface OsRefResumen {
  idOrdenServicio: number;
  numeroOs: string;
  fechaOs: string | null;
  fechaSistema: string | null;
  nombrePlan: string;
  nTipoPlan: string | null;
  tipoOS: string;
  tipoCodigo: string;
  idEstadoApiWorking: string;
  nEstadoApiWorking: string;
  deuda: number;
  deudaProyectada: number;
  existeEquipo: boolean;
  idEquipo: string | null;
  documentacion: { disponibles: number; total: number; porcentaje: number };
  facturas: { disponibles: number; equipoDisponibles: number };
  cantidadComprobantes: number;
  distribuidor: { id: string | null; nombre: string | null } | null;
  facturable: boolean;
  linkSistema: string | null;
  ejecutivo: string | null;
  pagos: PagoNormalizado[];
  postVentaExtra: PostVentaExtra | null;
}

export interface Ubicacion {
  departamento: string;
  provincia: string;
  distrito: string;
}

export interface ClienteSistemas {
  apiWorking: number;
  apiLoyalty: boolean;
  donChat: boolean;
  sireContable: boolean;
  apiReview: boolean;
  pos: boolean;
}

export interface PostVentaCliente {
  numeroDocumentoCliente: string;
  nombreCliente: string;
  sistemas: ClienteSistemas;
  telefono: string | null;
  telefonoManual: string | null;
  telefonoEfectivo: string | null;
  ubicacion: Ubicacion | { raw: string } | null;

  ordenVigente: OsRefResumen;
  planActual: {
    nombre: string;
    periodicidad: Periodicidad;
    precio: number | null;
    precioAnualProyectado: number | "No determinado";
  };

  osRefs: OsRefResumen[];
  cantidadOs: number;

  deudaTotal: number;
  fechaInicioCliente: string | null;
  antiguedad:
    | { texto: string; meses: number }
    | { texto: "No determinado"; meses: null };
  documentacionGlobal: { disponibles: number; total: number; porcentaje: number };
  cantidadComprobantesHistorico: number;

  ultimoVencimientoPago: string | null;
  proximaRenovacion: string | null;
  diasParaRenovacion: number | null;
  renovacionEnAlerta: boolean;
  vencidoDesde: string | null;
  diasVencido: number | null;
  ingresoMensualReal: number | null;

  estadoPostVenta: EstadoPostVenta;
  estadoPostVentaManual: EstadoPostVenta | null;
  estadoPostVentaEfectivo: EstadoPostVenta;

  segmentoManual: string | null;
  segmentoCalculado: SegmentoCartera | null;
  segmentoEfectivo: SegmentoCartera | string | null;
  etiquetas: string[];
  observacionGeneral: string | null;

  rubro: string | "No determinado";
  cantidadTrabajadores: number | null;
  cantidadTrabajadoresActualizadoEn: string | null;
  usuarios: string[];
  baseDatos: string | null;
  diasSinActividad: number | null;
  sinActividadReciente: boolean;

  metadata: {
    notasCount: number;
    tareasAbiertasCount: number;
    tareasTotalCount: number;
    alertasCount: { INFO: number; WARNING: number; CRITICAL: number };
  };

  generatedAt: string;
}

export interface SystemUsersCache {
  numeroDocumentoCliente: string;
  cantidadTrabajadores: number;
  baseDatos: string | null;
  usuarios: string[];
  linkSistemaUsado: string | null;
  updatedAt: string;
}

export interface ClientesQueryResult {
  data: PostVentaCliente[];
  page: number;
  pageSize: number;
  total: number;
}

// Resumen liviano para el mini-modulo "Dados de baja" de Clientes — no es un
// PostVentaCliente completo, solo lo necesario para esa lista.
// Referencia historica importada de clientes_de_baja.xlsx — seguimiento que
// ya se le hizo a este cliente ANTES de esta plataforma. Solo lectura, null
// si no aparecia en ese excel.
export interface BajaHistorico {
  numeroDocumentoCliente: string;
  idOrdenServicio: number;
  fechaBajaSuspension: string | null;
  fechaSeguimiento: string | null;
  medioComunicacion: string | null;
  resumenSeguimiento: string | null;
  estadoSeguimiento: string | null;
  estadoActual: string | null;
  observacionEncargado: string | null;
  fechaObservacionEncargado: string | null;
  resumenSeguimientoEncargado: string | null;
  fechaSeguimientoEncargado: string | null;
  estadoSeguimientoEncargado: string | null;
  medioComunicacionEncargado: string | null;
}

export interface ClienteBajaResumen {
  numeroDocumentoCliente: string;
  nombreCliente: string;
  sistemas: ClienteSistemas;
  planActual: { nombre: string; periodicidad: Periodicidad };
  deudaTotal: number;
  ejecutivo: string | null;
  fechaBaja: string | null;
  historico: BajaHistorico | null;
}

export interface ClientesBajaQueryResult {
  data: ClienteBajaResumen[];
  page: number;
  pageSize: number;
  total: number;
  // Solo presente cuando se filtra por periodo: clientes dados de baja cuya
  // fecha todavia no se verifico contra APIWorking, por lo tanto no pueden
  // evaluarse contra el rango elegido y quedan fuera de "total".
  pendientesVerificar?: number;
}

export interface FichaClienteResponse {
  cliente: PostVentaCliente;
  notas: Nota[];
  tareas: Tarea[];
  alertas: Alerta[];
  oportunidades: Oportunidad[];
  intereses: { catalogo: InteresCatalogo[]; marcados: number[] };
  reuniones: Reunion[];
  seguimientoPostVenta: SeguimientoResumen | null;
}

export interface InteresCatalogo {
  id: number;
  icono: string | null;
  nombre: string;
  descripcion: string | null;
  etiqueta: string | null;
  orden: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ModalidadReunion = "VIRTUAL" | "PRESENCIAL";
export type EstadoReunion = "PROGRAMADA" | "COMPLETADA" | "CANCELADA";

export interface Reunion {
  id: number;
  numeroDocumentoCliente: string;
  idOrdenServicio: number | null;
  ejecutivo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  modalidad: ModalidadReunion;
  lugarOLink: string | null;
  nota: string | null;
  estado: EstadoReunion;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostVentaConfigValues {
  "estado.deuda_atencion_min": number;
  "estado.documentacion_completa_min": number;
  "alerta.deuda_min": number;
  "alerta.antiguedad_aniversario_meses": number;
  "oportunidad.cliente_antiguo_meses_min": number;
  "oportunidad.alto_volumen_comprobantes_min": number;
  "sync.fecha_inicio": string;
  "sync.post_venta_fecha_inicio": string;
  "dataset.estados_excluidos": string;
  "segmento.diamante_max_dias": number;
  "segmento.oro_max_dias": number;
  "segmento.plata_max_dias": number;
  "renovacion.alerta_mensual_dias": number;
  "renovacion.alerta_trimestral_dias": number;
  "renovacion.alerta_semestral_dias": number;
  "renovacion.alerta_anual_dias": number;
  "actividad.dias_sin_uso_alerta": number;
  "seguimiento.dias_etapa2": number;
  "seguimiento.dias_etapa3": number;
  "seguimiento.fecha_corte_clientes_nuevos": string;
}

export interface Alerta {
  id: string;
  tipo: string;
  nivel: NivelAlerta;
  titulo: string;
  mensaje: string;
  cliente: string;
  nombreCliente: string;
  sistemas: ClienteSistemas;
  idOrdenServicio: number | null;
  fecha: string;
  origen: string;
  estado: "ABIERTA";
}

export interface Oportunidad {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  cliente: string;
  nombreCliente: string;
  sistemas: ClienteSistemas;
  idOrdenServicio: number | null;
  valorEstimado: number | "No determinado";
  fecha: string;
  origen: string;
}

export interface Nota {
  id: number;
  numeroDocumentoCliente: string;
  idOrdenServicio: number | null;
  usuario: string;
  nota: string;
  createdAt: string;
  updatedAt: string;
}

export type PrioridadTarea = "BAJA" | "MEDIA" | "ALTA";
export type EstadoTarea =
  | "PENDIENTE"
  | "EN_PROCESO"
  | "ESPERANDO_CLIENTE"
  | "COMPLETADA"
  | "CANCELADA";

export interface Tarea {
  id: number;
  numeroDocumentoCliente: string;
  idOrdenServicio: number | null;
  titulo: string;
  descripcion: string | null;
  responsable: string;
  prioridad: PrioridadTarea;
  estado: EstadoTarea;
  fechaVencimiento: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Seguimiento {
  id: number;
  tareaId: number;
  usuario: string;
  comentario: string;
  estadoEnEseMomento: EstadoTarea | null;
  createdAt: string;
}

export interface SavedView {
  id: number;
  usuario: string;
  screen: string;
  nombre: string;
  columnas: string[];
  filtros: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardKpis {
  generatedAt: string;
  totalClientes: number;
  totalOs: number;
  deudaTotal: number;
  clientesConDeuda: number;
  clientesSinEquipo: number;
  clientesDocumentacionIncompleta: number;
  comprobantesHistoricoTotal: number;
  clientesPorEstado: { NORMAL: number; REVISAR: number; ATENCION: number };
  clientesPorEstadoApiWorking: { estado: string; count: number }[];
  clientesPorPeriodicidad: Record<Periodicidad, number>;
  clientesPorEjecutivo: { ejecutivo: string; count: number }[];
  clientesPorTipoOs: { tipo: string; count: number }[];
  topPlanes: { plan: string; count: number }[];
  distribucionDepartamentos: { departamento: string; count: number }[];
  alertasPorNivel: { INFO: number; WARNING: number; CRITICAL: number };
  oportunidadesPorTipo: Record<string, number>;
}

// Historial de seguimiento (Administrativo/historial-seguimiento, origen=1 —
// Orden de Servicio). Bitacora real de APIWorking: cada cambio de estado,
// quien lo hizo y una observacion libre.
export interface HistorialSeguimientoEvento {
  fecha: string | null;
  idEstado: number;
  estado: string;
  persona: string;
  observacion: string;
}

// Incidencias (Administrativo/incidencias) — a diferencia del historial de
// seguimiento, tiene estado de resolucion real: `resuelta` viene de
// condicion "C" (cerrada) vs "A" (abierta) en la API externa.
export interface Incidencia {
  idIncidencia: number;
  idOrdenServicio: number;
  numeroOs: string;
  fecha: string | null;
  caso: string;
  tipo: string;
  estado: string;
  resuelta: boolean;
  asignadoPor: string;
  asignadoA: string;
  aCargo: string;
  telefono: string | null;
  descripcion: string;
  reportadoPorCliente: boolean;
  automatico: boolean;
}

export interface IncidenciasResponse {
  data: Incidencia[];
  total: number;
  abiertas: number;
  resueltas: number;
}

// ---------------------------------------------------------------------------
// Seguimiento Post Venta ("Meta Team") — onboarding de clientes recien
// capacitados en 3 rondas de contacto (bienvenida, +15 dias, +30 dias).
// ---------------------------------------------------------------------------
export type EstadoPipelineSeguimiento = "EN_PROCESO" | "EXITOSO" | "REQUIERE_ATENCION";
export type OrigenSeguimiento = "AUTOMATICO" | "IMPORTADO_EXCEL";

export interface SeguimientoCliente {
  id: number;
  numeroDocumentoCliente: string;
  idOrdenServicio: number;
  fechaInicio: string;
  estadoPipeline: EstadoPipelineSeguimiento;
  origen: OrigenSeguimiento;
  createdAt: string;
  updatedAt: string;
}

export interface SeguimientoEtapa {
  id: number;
  seguimientoClienteId: number;
  etapa: 1 | 2 | 3;
  fechaRealizado: string | null;
  medioComunicacion: string | null;
  estadoSeguimiento: string | null;
  resumen: string | null;
  solicitudCliente: string | null;
  usuario: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EtapaActualInfo {
  etapa: 1 | 2 | 3;
  label: string;
  diasParaSiguiente: number | null;
  vencida: boolean;
}

export interface SeguimientoResumen {
  numeroDocumentoCliente: string;
  nombreCliente: string;
  plan: string;
  sistemas: ClienteSistemas;
  ejecutivo: string | null;
  origen: OrigenSeguimiento;
  estadoPipeline: EstadoPipelineSeguimiento;
  fechaInicio: string;
  etapaActual: EtapaActualInfo | null;
}

export interface SeguimientoDetalle {
  cliente: SeguimientoCliente;
  etapas: SeguimientoEtapa[];
  etapaActual: EtapaActualInfo | null;
  incidencias: HistorialSeguimientoEvento[];
  notas: Nota[];
}
