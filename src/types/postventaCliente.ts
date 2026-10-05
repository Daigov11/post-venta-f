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

// Los 4 slots de documentacion de APIWorking (existeFile1..4) confirmados
// con el negocio — orden fijo: Carta, Foto DNI, Clave SOL, Pagos.
export type ClaveDocumento = "CARTA" | "FOTO_DNI" | "CLAVE_SOL" | "PAGOS";

export interface DocumentoDetalle {
  clave: ClaveDocumento;
  etiqueta: string;
  disponible: boolean;
}

export interface DocumentacionResumen {
  disponibles: number;
  total: number;
  porcentaje: number;
  detalle: DocumentoDetalle[];
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
  documentacion: DocumentacionResumen;
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
  documentacionGlobal: DocumentacionResumen;
  cantidadComprobantesHistorico: number;

  ultimoVencimientoPago: string | null;
  proximaRenovacion: string | null;
  diasParaRenovacion: number | null;
  renovacionEnAlerta: boolean;
  // false solo cuando la periodicidad necesita anclarse a un comprobante
  // real de renovacion (Trimestral/Semestral/Anual) y el cliente nunca tuvo
  // uno — la fecha cayo al respaldo de fechaSistema, que puede errar por
  // meses. Mensual siempre true. Ver backend/src/types/postventa.ts.
  renovacionAnclaConfiable: boolean;
  // Dia real de facturacion (1/12/22/etc.), solo para periodicidad MENSUAL —
  // confirmado con negocio que el ciclo de facturacion como filtro solo
  // aplica ahi. null si no es Mensual o si no hay dia identificable.
  diaCicloMensual: number | null;
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
  altaPendiente: boolean;
  certificadoPorVencer: boolean;
  certificadoVenceHoy: boolean;

  metadata: {
    notasCount: number;
    tareasAbiertasCount: number;
    tareasTotalCount: number;
    alertasCount: { INFO: number; WARNING: number; CRITICAL: number };
  };

  // Solo presente en GET /api/clientes (Cartera) — ver modulo Recuperacion.
  recuperacionAbiertaCount?: number;

  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Modulo "Recuperacion de clientes" — la unidad es la orden de servicio
// (idOrdenServicio), nunca el RUC.
// ---------------------------------------------------------------------------
export type OrigenRecuperacion = "RENOVACION_IMPAGA" | "SUSPENSION" | "BAJA";
export type EstadoRecuperacion =
  | "EN_RECUPERACION"
  | "RECUPERADO"
  | "PERDIDO"
  | "PENDIENTE_VALIDACION";

export interface EpisodioRecuperacion {
  id: number;
  idOrdenServicio: number;
  numeroDocumentoCliente: string;
  nombreCliente: string;
  origen: OrigenRecuperacion;
  numeroEpisodio: number;
  estado: EstadoRecuperacion;
  fechaIngreso: string | null;
  fechaLimite: string | null;
  motivo: string | null;
  responsable: string | null;
  resultado: string | null;
  fechaRecuperacion: string | null;
  fechaPerdida: string | null;
  creadoPor: string;
  creadoEn: string;
  actualizadoEn: string;
  // Dato financiero vivo, nunca una copia guardada — resuelto contra el
  // dataset actual en cada request (ver recuperacionService.ts).
  monto: number | null;
}

export interface RecuperacionResumen {
  enRecuperacion: number;
  porVencer: number;
  recuperados: number;
  perdidos: number;
}

export interface RecuperacionQueryResult {
  data: EpisodioRecuperacion[];
  total: number;
  page: number;
  pageSize: number;
  resumen: RecuperacionResumen;
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
  // Solo presente en la respuesta de /api/clientes desde el ajuste de
  // Renovaciones (Fase 3.1) — opcional para no forzar a los demas
  // consumidores de este tipo a manejarlo.
  generatedAt?: string;
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

// Resumen agregado para el aviso de transparencia de Renovaciones —
// "excluidos de proyeccion: baja con deuda pendiente". Nunca afirma "falta
// de pago" como motivo confirmado (no existe ese dato en ningun lado, ver
// bajaSeguimiento.ts en el backend): es un proxy inferido por deuda
// pendiente al momento de la baja, siempre etiquetado como tal en la UI.
export interface ResumenBajas {
  totalBajas: number;
  sinVerificar: number;
  sinFechaConfirmada: number;
  recientes: number;
  excluidosPorFaltaDePago: {
    count: number;
    monto: number;
    clientes: Pick<
      ClienteBajaResumen,
      "numeroDocumentoCliente" | "nombreCliente" | "sistemas" | "planActual" | "deudaTotal" | "ejecutivo" | "fechaBaja"
    >[];
  };
  bajaSinDeudaMasDe30Dias: { count: number };
  umbralDias: number;
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
export type EstadoReunion = "PROGRAMADA" | "COMPLETADA" | "CANCELADA" | "EN_ESPERA";

export interface Reunion {
  id: number;
  numeroDocumentoCliente: string;
  idOrdenServicio: number | null;
  ejecutivo: string;
  // null solo mientras estado === "EN_ESPERA" (reunion especial sin horario
  // asignado todavia).
  fecha: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  modalidad: ModalidadReunion;
  // null = reunion regular. "CAPACITACION" | "REFORZAMIENTO" | texto libre
  // para una reunion especial.
  tipoReunion: string | null;
  lugarOLink: string | null;
  nota: string | null;
  estado: EstadoReunion;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReunionConCliente {
  reunion: Reunion;
  cliente: {
    numeroDocumentoCliente: string;
    nombreCliente: string;
    sistemas: ClienteSistemas;
  } | null;
}

export interface PostVentaConfigValues {
  "estado.deuda_atencion_min": number;
  "estado.documentacion_completa_min": number;
  "alerta.deuda_min": number;
  "alerta.deuda_dias_max": number;
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

// ABIERTA = calculado. VISTA/RESUELTA son marcas manuales — una vez
// RESUELTA queda asi hasta que alguien la reabra a mano.
export type EstadoAlerta = "ABIERTA" | "VISTA" | "RESUELTA";

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
  telefonoEfectivo: string | null;
  fecha: string;
  origen: string;
  estado: EstadoAlerta;
}

export type EstadoOportunidad = "ABIERTA" | "EN_GESTION" | "GANADA" | "PERDIDA";

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
  estado: EstadoOportunidad;
  responsable: string | null;
  siguienteAccion: string | null;
  resultado: string | null;
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

export type EntidadAdjunto = "NOTA" | "TAREA_SEGUIMIENTO" | "REUNION" | "INCIDENCIA_MANUAL";

export interface Adjunto {
  id: number;
  entidadTipo: EntidadAdjunto;
  entidadId: number;
  url: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  usuario: string;
  createdAt: string;
}

// Incidencia registrada a mano desde la app — todavia no conectada al
// endpoint de creacion de APIWorking (existe, se conecta mas adelante), asi
// que no aparece en Administrativo/incidencias, solo aca.
export interface IncidenciaManual {
  id: number;
  numeroDocumentoCliente: string;
  idOrdenServicio: number | null;
  caso: string;
  tipo: string | null;
  descripcion: string | null;
  createdBy: string;
  createdAt: string;
}

export type CanalContacto = "LLAMADA" | "WHATSAPP";

export interface Contacto {
  id: number;
  numeroDocumentoCliente: string;
  idOrdenServicio: number | null;
  canal: CanalContacto;
  usuario: string;
  createdAt: string;
}

export type PrioridadTarea = "BAJA" | "MEDIA" | "ALTA";
export type EstadoTarea =
  | "PENDIENTE"
  | "EN_PROCESO"
  | "ESPERANDO_CLIENTE"
  | "COMPLETADA"
  | "CANCELADA";
// Naturaleza de la tarea (que tipo de trabajo es) — distinto de OrigenTarea
// (como se creo). PENDIENTE_CLASIFICACION = tareas historicas de antes de
// esta separacion (ex "MANUAL"), nunca reclasificadas sin evidencia real.
export type TipoTarea =
  | "RENOVACION"
  | "PENDIENTE_CLASIFICACION"
  | "COBRANZA"
  | "DOCUMENTACION"
  | "SOPORTE"
  | "SEGUIMIENTO"
  | "REUNION"
  | "OPORTUNIDAD_COMERCIAL";

export type OrigenTarea =
  | "MANUAL"
  | "ALERTA"
  | "INCIDENCIA"
  | "FICHA_CLIENTE"
  | "OPORTUNIDAD"
  | "RENOVACION"
  // Reparto mensual automatico de todos los clientes activos, ver
  // sincronizarTareasRepartoMensual en el backend.
  | "REPARTO_MENSUAL"
  | "RECUPERACION";

export interface Tarea {
  id: number;
  numeroDocumentoCliente: string;
  idOrdenServicio: number | null;
  tipo: TipoTarea;
  origen: OrigenTarea;
  origenEntidadTipo: string | null;
  origenEntidadId: string | null;
  // "YYYY-MM", solo para origen=REPARTO_MENSUAL — ver migracion 0040.
  periodoReparto: string | null;
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

// Devuelto por GET /api/tareas — incidenciaAbierta: true/false = estado real
// (snapshot diario ya cargado, sin llamadas nuevas a APIWorking), null = la
// tarea no esta ligada a una incidencia O si lo esta, no se pudo determinar
// su estado (nunca leer null como "resuelta" cuando origenEntidadTipo SI es
// "INCIDENCIA" — mostrar "Estado de incidencia no disponible").
export interface TareaListItem extends Tarea {
  incidenciaAbierta: boolean | null;
}

// Tarea tipo RENOVACION + snapshot en vivo del cliente (periodicidad,
// proxima renovacion, ingreso mensual) para filtrar/ordenar sin otro fetch.
export interface TareaRenovacion {
  tarea: Tarea;
  cliente: {
    numeroDocumentoCliente: string;
    nombreCliente: string;
    sistemas: ClienteSistemas;
    periodicidad: Periodicidad;
    proximaRenovacion: string | null;
    diasParaRenovacion: number | null;
    ingresoMensualReal: number | null;
  };
}

export interface TareaCarteraMensual {
  tarea: Tarea;
  cliente: {
    numeroDocumentoCliente: string;
    nombreCliente: string;
    sistemas: ClienteSistemas;
    periodicidad: Periodicidad;
  };
}

export interface ResumenCarteraMensual {
  periodo: string;
  total: number;
  contactados: number;
  noContactados: number;
  pendientesDeRedistribuir: number;
  porDia: { fecha: string; total: number; contactados: number }[];
  porResponsable: { responsable: string; total: number; contactados: number }[];
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
  // KPIs financiero-operativos del Panel principal (Fase 1 Postventa) — ver
  // calcularKpisPanel en el backend, misma formula que Renovaciones.tsx.
  totalEsperadoMes: number;
  estimadoRecaudarHoy: number;
  totalCobradoMes: number;
  deudaPorAntiguedad: { unMes: number; dosMeses: number; tresMasMeses: number };
  clientesLoyalty: number;
  renovacionesProximas: { count: number; monto: number };
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

export interface TipoIncidenciaCatalogo {
  id: number;
  nombre: string;
}

export interface Capacitacion {
  idCapacitacion: number;
  tipo: string;
  estado: "CANCELADA" | "CAPACITADO" | "PENDIENTE";
  numeroDocumentoCliente: string | null;
  numeroOs: string | null;
  fecha: string | null;
  fechaFinal: string | null;
  capacitador: string | null;
  agendador: string | null;
  vendedor: string | null;
  modalidad: string | null;
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

// Resultados y cierre diario (Fase 3) — 100% local, sin dependencia de
// APIWorking. Ver backend/src/types/postventa.ts para el detalle de por qué
// no existe monto de cierre ni formula de cuadre.
export type EstadoResultadoDia = "ABIERTO" | "CERRADO";
export type TipoConversion = "EQUIPO" | "PLAN" | "MODULO";

export interface ResultadoAccion {
  id: number;
  resultadoDiaId: number;
  tipo: string;
  realizadas: number;
  noRealizadas: number;
}

export interface ResultadoConversion {
  id: number;
  resultadoDiaId: number;
  tipo: TipoConversion;
  cantidad: number;
  detalle: string | null;
}

export interface ResultadoDia {
  id: number;
  usuario: string;
  fecha: string;
  estado: EstadoResultadoDia;
  montoApertura: number;
  horaApertura: string;
  horaCierre: string | null;
  observacionCierre: string | null;
  avisoAdministracion: boolean;
  motivoAviso: string | null;
  acciones: ResultadoAccion[];
  conversiones: ResultadoConversion[];
}

export interface ResultadoDiaResumen {
  id: number;
  usuario: string;
  fecha: string;
  estado: EstadoResultadoDia;
  montoApertura: number;
  horaApertura: string;
  horaCierre: string | null;
  avisoAdministracion: boolean;
  totalRealizadas: number;
  totalNoRealizadas: number;
  totalConversiones: number;
  conversionesPorTipo: Record<TipoConversion, number>;
}

// Registro automatico de eventos operativos (ajuste funcional Fase 3) — ver
// backend/src/types/postventa.ts para el detalle de cada tipo.
export type TipoAccionOperativa =
  | "CONTACTO_LLAMADA"
  | "CONTACTO_WHATSAPP"
  | "TAREA_CREADA"
  | "TAREA_COMPLETADA"
  | "TAREA_POSTERGADA"
  | "TAREA_REASIGNADA"
  | "ALERTA_RESUELTA"
  | "INCIDENCIA_CREADA"
  | "SEGUIMIENTO_REGISTRADO"
  | "OPORTUNIDAD_GESTIONADA"
  | "CONVERSION_REGISTRADA"
  | "DIA_ABIERTO"
  | "DIA_CERRADO";

export interface EventoOperativo {
  id: number;
  usuario: string;
  tipoAccion: TipoAccionOperativa;
  modulo: string;
  numeroDocumentoCliente: string | null;
  entidadTipo: string | null;
  entidadId: string | null;
  resultado: string;
  detalle: string | null;
  createdAt: string;
}

export interface ResumenEventosOperativos {
  usuario: string;
  fecha: string;
  total: number;
  porTipo: Partial<Record<TipoAccionOperativa, number>>;
}

// ---------------------------------------------------------------------------
// "La Bolsa" — reemplaza al modulo Resultados. Ver backend
// types/postventa.ts para el detalle completo de por que los contadores
// nunca se persisten (siempre en vivo). Sin roles: cada usuario ve
// unicamente su propia bolsa (no se introdujo un panel de "todos los
// usuarios" sin decision explicita de negocio).
// ---------------------------------------------------------------------------
export type EstadoBolsaSesion = "ABIERTA" | "CERRADA";
export type OrigenBolsaSesion = "AUTOMATICA" | "MANUAL";

// Categorias fijas de conversion (antes texto libre) — "OTRO" es solo una
// red de seguridad para historial migrado, nunca aparece como opcion.
export type TipoBolsaConversion =
  | "CAMBIO_PERIODICIDAD"
  | "ADQUISICION_EQUIPO"
  | "RECUPERACION_CLIENTE"
  | "VENTA_PRODUCTO"
  | "APILOYALTY"
  | "APIREVIEW"
  | "OTRO";

export interface BolsaSesion {
  id: number;
  usuario: string;
  fecha: string;
  numeroApertura: number;
  abiertaEn: string;
  cerradaEn: string | null;
  origenApertura: OrigenBolsaSesion;
  origenCierre: OrigenBolsaSesion | null;
  observacionCierre: string | null;
  estado: EstadoBolsaSesion;
  createdAt: string;
  updatedAt: string;
}

export interface BolsaConversion {
  id: number;
  bolsaSesionId: number;
  tipo: TipoBolsaConversion;
  descripcion: string | null;
  createdBy: string;
  createdAt: string;
}

export interface BolsaOportunidadGanada {
  tipo: string;
  cantidad: number;
  montoTotal: number;
}

export interface BolsaResumen {
  contactos: number;
  misionesCompletadas: number;
  oportunidadesGanadas: BolsaOportunidadGanada[];
  totalSoles: number;
  conversiones: BolsaConversion[];
}

// Notificacion del dia anterior (pedido explicito) — el frontend decide
// mostrarla una sola vez por dia (ver Bolsa.tsx, se guarda en localStorage
// que ya se cerro), el backend simplemente la manda cuando hay datos.
export interface BolsaResumenDiaAnterior {
  fecha: string;
  aperturas: number;
  cierres: number;
  clientesContactadosUnicos: number;
  misionesCompletadas: number;
  conversionesPorCategoria: { tipo: TipoBolsaConversion; cantidad: number }[];
}

export interface BolsaEstado {
  sesion: BolsaSesion | null;
  resumen: BolsaResumen;
  resumenDiaAnterior: BolsaResumenDiaAnterior | null;
}
