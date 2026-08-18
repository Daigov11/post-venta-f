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

export interface PostVentaCliente {
  numeroDocumentoCliente: string;
  nombreCliente: string;
  telefono: string | null;
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
  diasSinActividad: number | null;

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

export interface FichaClienteResponse {
  cliente: PostVentaCliente;
  notas: Nota[];
  tareas: Tarea[];
  alertas: Alerta[];
  oportunidades: Oportunidad[];
  intereses: { catalogo: InteresCatalogo[]; marcados: number[] };
  reuniones: Reunion[];
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
}

export interface Alerta {
  id: string;
  tipo: string;
  nivel: NivelAlerta;
  titulo: string;
  mensaje: string;
  cliente: string;
  nombreCliente: string;
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
