import type { PagoNormalizado, Periodicidad, PostVentaCliente } from "../../types/postventaCliente";

export const PERIODICIDAD_MESES: Record<Exclude<Periodicidad, "DESCONOCIDO">, number> = {
  MENSUAL: 1,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
};

export const PERIODICIDAD_LABEL: Record<Exclude<Periodicidad, "DESCONOCIDO">, string> = {
  MENSUAL: "Mensual",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL: "Semestral",
  ANUAL: "Anual",
};

// Mismo criterio que el resto del modulo (Clientes/Alertas): ya viene
// golpeado, no es una renovacion que simplemente se acerca. Su fecha
// relevante es vencidoDesde, no proximaRenovacion (que sigue avanzando
// aunque no haya pagado).
export function esProblema(cliente: PostVentaCliente): boolean {
  return (
    cliente.segmentoEfectivo === "CRITICO" ||
    cliente.ordenVigente.nEstadoApiWorking.trim().toUpperCase() === "SUSPENDIDO POR PAGO"
  );
}

// Estados de nEstadoApiWorking confirmados con el negocio (auditoria del
// 2026-09-21 sobre los 2465 clientes reales) donde no se esta generando ni
// se sabe si se va a generar ingreso: demo/plan gratis (el propio
// APIWorking los marca "NO SE FACTURA"), inactivo, o nunca llego a
// facturar (pendiente de activacion / sin instalar / plan sin confirmar).
// Deliberadamente NO incluye "INICIAR COBRANZA" (1047 clientes, el grueso
// de la cartera activa) ni otros estados operativos normales — no hay
// evidencia de que esos no generen ingreso, y excluirlos por una suposicion
// vaciaria la proyeccion sin respaldo real.
const ESTADOS_SIN_INGRESOS = new Set([
  "SISTEMA DEMO PARA DISTRIBUIDOR/VENTAS (NO SE FACTURA)",
  "CLIENTE ACTIVO PLAN GRATIS O COBRADO EN OTRA ORDEN DE SERVICIO (NO SE FACTURA)",
  "CLIENTE INACTIVO",
  "PENDIENTE DE ACTIVACION",
  "SIN INSTALAR",
  "POR CONFIRMAR PLAN",
]);

// No se sabe si este cliente va a volver a generar ingreso — se excluye de
// toda proyeccion confiable (esperado/vencidos/cierre) y se muestra aparte,
// con su deuda actual "hasta su ultimo comprobante" (nunca proyectada hacia
// adelante).
export function esSinIngresos(cliente: PostVentaCliente): boolean {
  return ESTADOS_SIN_INGRESOS.has(cliente.ordenVigente.nEstadoApiWorking.trim().toUpperCase());
}

// Monto real esperado en el PROXIMO CICLO completo (no un promedio
// mensual) — el ultimo comprobante real x cantidad de meses de la
// periodicidad. ingresoMensualReal ya es "total del ultimo comprobante /
// meses de periodicidad" (ver backend/facturacion.ts), asi que multiplicar
// de vuelta reconstruye el monto real del ciclo — no es una proyeccion
// inventada, es el mismo dato ya validado, sin normalizar a "por mes".
// Null si nunca hubo comprobante o la periodicidad es desconocida.
export function montoRealCiclo(cliente: PostVentaCliente): number | null {
  const periodicidad = cliente.planActual.periodicidad;
  if (cliente.ingresoMensualReal == null || periodicidad === "DESCONOCIDO") return null;
  return cliente.ingresoMensualReal * PERIODICIDAD_MESES[periodicidad];
}

// Fecha relevante para "cuando le toca actuar" — vencidoDesde para clientes
// en problema, proximaRenovacion para el resto.
export function fechaRelevante(cliente: PostVentaCliente): string | null {
  return esProblema(cliente) ? cliente.vencidoDesde : cliente.proximaRenovacion;
}

// Entra en cualquier suma "esperada"/"confiable" solo si: su estado genera
// ingreso, tiene monto real de ciclo, ancla confiable (no el respaldo de
// fechaSistema para Trimestral/Semestral/Anual sin comprobante), y una
// fecha relevante. Si falta cualquiera, el cliente cae en "pendiente de
// validacion"/"sin ingresos" segun corresponda — nunca se cuenta como monto
// confiable.
export function esProyeccionConfiable(cliente: PostVentaCliente): boolean {
  if (esSinIngresos(cliente)) return false;
  if (montoRealCiclo(cliente) === null) return false;
  if (!cliente.renovacionAnclaConfiable) return false;
  return fechaRelevante(cliente) !== null;
}

// Clientes cuya periodicidad EXIGE anclarse a un comprobante real
// (Trimestral/Semestral/Anual) pero nunca tuvieron uno — la fecha de
// renovacion que se les calculo es el respaldo de fechaSistema, que puede
// errar por meses. No hay ningun campo de "pago en cuotas" en los datos,
// asi que esa parte del pedido original queda fuera (no se inventa).
export function esAnclaPendiente(cliente: PostVentaCliente): boolean {
  const periodicidad = cliente.planActual.periodicidad;
  return (
    (periodicidad === "TRIMESTRAL" || periodicidad === "SEMESTRAL" || periodicidad === "ANUAL") &&
    !cliente.renovacionAnclaConfiable
  );
}

export interface MesInfo {
  anio: number;
  mes: number; // 0-indexado, como Date.getMonth()
  label: string;
}

export function mesRelativo(base: Date, offsetMeses: number): MesInfo {
  const d = new Date(base.getFullYear(), base.getMonth() + offsetMeses, 1);
  return {
    anio: d.getFullYear(),
    mes: d.getMonth(),
    label: d.toLocaleDateString("es-PE", { month: "long", year: "numeric" }),
  };
}

export function esMismoDiaCalendario(iso: string, fecha: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === fecha.getFullYear() &&
    d.getMonth() === fecha.getMonth() &&
    d.getDate() === fecha.getDate()
  );
}

function dentroDeRangoInclusive(iso: string, desde: Date, hasta: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= desde.getTime() && t <= hasta.getTime();
}

function finDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);
}

export function primerDiaMes(mesInfo: MesInfo): Date {
  return new Date(mesInfo.anio, mesInfo.mes, 1);
}

export function ultimoDiaMes(mesInfo: MesInfo): Date {
  return finDelDia(new Date(mesInfo.anio, mesInfo.mes + 1, 0));
}

// Dias de diferencia entre la fecha esperada de un cliente y la fecha de
// corte — positivo = ya paso el corte (vencido hace N dias), negativo =
// todavia faltan N dias. Se calcula siempre contra el CORTE elegido (no
// contra "hoy" real), para que el numero mostrado sea consistente con la
// fecha que el usuario esta inspeccionando.
function diasRelativosACorte(iso: string, fechaCorte: Date): number {
  const msPorDia = 1000 * 60 * 60 * 24;
  const fecha = new Date(new Date(iso).getFullYear(), new Date(iso).getMonth(), new Date(iso).getDate());
  const corte = new Date(fechaCorte.getFullYear(), fechaCorte.getMonth(), fechaCorte.getDate());
  return Math.round((corte.getTime() - fecha.getTime()) / msPorDia);
}

// Origenes que representan el cargo real del ciclo (Plan/Anualidad) para
// Semestral/Anual — mismo criterio que usa el backend para anclar la
// renovacion (ver ORIGENES_RENOVACION_REAL en facturacion.ts). Un cargo
// suelto ("Directo") no cuenta como renovacion real para esos casos.
const ORIGENES_RENOVACION_REAL = new Set(["Administrativo Anualidad", "Administrativo Plan"]);

export interface MontoConteo {
  monto: number;
  count: number;
}

export interface MontoConteoSistemas extends MontoConteo {
  sistemas: number;
}

// El comprobante REAL que corresponde a la renovacion de este cliente dentro
// de [desde, hasta] — mismo filtro de origen que ya usa el backend para
// anclar Semestral/Anual (ORIGENES_RENOVACION_REAL). null si no hay ninguno:
// ese cliente sigue "esperado" pero no "cobrado" en este rango.
export function comprobanteVinculado(
  cliente: PostVentaCliente,
  desde: Date,
  hasta: Date
): PagoNormalizado | null {
  const enRango = cliente.ordenVigente.pagos.filter(
    (p): p is PagoNormalizado & { fechaEmitido: string } =>
      p.fechaEmitido !== null && dentroDeRangoInclusive(p.fechaEmitido, desde, hasta)
  );
  const periodicidad = cliente.planActual.periodicidad;
  const relevantes =
    periodicidad === "SEMESTRAL" || periodicidad === "ANUAL"
      ? enRango.filter((p) => ORIGENES_RENOVACION_REAL.has(p.origen))
      : enRango;
  const candidatos = relevantes.length > 0 ? relevantes : enRango;
  if (candidatos.length === 0) return null;
  return candidatos.reduce((a, b) => (a.fechaEmitido! > b.fechaEmitido! ? a : b));
}

// "Pagos generales del mes" — TODOS los comprobantes de renovacion emitidos
// en el mes, sin filtrar por si ese cliente esta en el universo de este
// mes. Deliberadamente informativo y NUNCA se mezcla con "cobrado del mes"
// (que solo cuenta pagos vinculados a una renovacion programada de este
// mismo mes) — mezclarlos seria comparar dos universos distintos.
export function pagosGeneralesDelMes(todos: PostVentaCliente[], mesInfo: MesInfo): number {
  const desde = primerDiaMes(mesInfo);
  const hasta = ultimoDiaMes(mesInfo);
  let total = 0;
  for (const c of todos) {
    const enRango = c.ordenVigente.pagos.filter(
      (p): p is PagoNormalizado & { fechaEmitido: string } =>
        p.fechaEmitido !== null && dentroDeRangoInclusive(p.fechaEmitido, desde, hasta)
    );
    const periodicidad = c.planActual.periodicidad;
    const relevantes =
      periodicidad === "SEMESTRAL" || periodicidad === "ANUAL"
        ? enRango.filter((p) => ORIGENES_RENOVACION_REAL.has(p.origen))
        : enRango;
    const candidatos = relevantes.length > 0 ? relevantes : enRango;
    for (const p of candidatos) total += p.total - p.deuda;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Clasificacion unica por cliente para el mes+corte seleccionados. Es la
// UNICA fuente de verdad: el resumen superior y la lista de cobranza usan
// exactamente esta misma funcion, nunca una definicion paralela.
//
// null = el cliente no pertenece al universo de ESTE mes (sin ingresos,
// ciclo no confiable/ancla pendiente, sin fecha, fuera del rango del mes, o
// deuda arrastrada de un mes ANTERIOR — esos casos se muestran aparte, como
// avisos secundarios, nunca en la lista de cobranza del mes).
// ---------------------------------------------------------------------------

export type ClaseCobranzaMes = "pagado" | "vencido_este_mes" | "vence_hoy" | "proximo";

export function claseCobranzaMes(
  cliente: PostVentaCliente,
  fechaCorte: Date,
  inicioMes: Date,
  finMes: Date
): ClaseCobranzaMes | null {
  if (!esProyeccionConfiable(cliente)) return null; // cubre sin ingresos, ancla pendiente, sin dato

  if (esProblema(cliente)) {
    // Ya vencido por definicion (si hubiera pagado, ya no seria "problema").
    // Solo pertenece a ESTE mes si su vencimiento cayo dentro de el — si es
    // de un mes anterior, es deuda arrastrada (ver resumenDeudaArrastrada),
    // nunca se mezcla aqui.
    if (cliente.vencidoDesde === null) return null;
    if (!dentroDeRangoInclusive(cliente.vencidoDesde, inicioMes, finMes)) return null;
    return "vencido_este_mes";
  }

  const iso = cliente.proximaRenovacion;
  if (!iso || !dentroDeRangoInclusive(iso, inicioMes, finMes)) return null;

  if (comprobanteVinculado(cliente, inicioMes, finMes)) return "pagado";
  if (esMismoDiaCalendario(iso, fechaCorte)) return "vence_hoy";
  return diasRelativosACorte(iso, fechaCorte) > 0 ? "vencido_este_mes" : "proximo";
}

// Segmentacion de "No pagaron" para los filtros de la lista de cobranza —
// mas fina que ClaseCobranzaMes: separa "proximo" (usado como Estado/badge)
// en "proximos a vencer" (siguientes 7 dias desde el corte) y "resto del
// mes" (mas alla de 7 dias, todavia dentro del mismo mes). No cambia el
// Estado que se muestra en la fila (sigue siendo "🔵 Próximo" para ambos),
// solo en que boton de filtro cae.
export type SegmentoListaCobranza = "vencido_este_mes" | "vence_hoy" | "proximos_7_dias" | "resto_mes";

const UMBRAL_PROXIMOS_DIAS = 7;

export function segmentoListaCobranza(
  cliente: PostVentaCliente,
  clase: ClaseCobranzaMes,
  fechaCorte: Date
): SegmentoListaCobranza | null {
  if (clase === "pagado") return null;
  if (clase === "vencido_este_mes") return "vencido_este_mes";
  if (clase === "vence_hoy") return "vence_hoy";
  const iso = cliente.proximaRenovacion;
  if (!iso) return "resto_mes";
  const diasHastaVencer = -diasRelativosACorte(iso, fechaCorte);
  return diasHastaVencer <= UMBRAL_PROXIMOS_DIAS ? "proximos_7_dias" : "resto_mes";
}

export interface ResumenMensual {
  mesInfo: MesInfo;
  fechaCorte: Date;
  esCorteHoy: boolean;
  cobradoDelMes: MontoConteo;
  venceHoy: MontoConteoSistemas;
  vencidosEsteMes: MontoConteoSistemas;
  proximoAVencer: MontoConteoSistemas;
  porCobrarDelMes: MontoConteoSistemas;
  esperadoTotalDelMes: MontoConteo;
  pagosGeneralesDelMes: number;
}

export function calcularResumenMensual(todos: PostVentaCliente[], fechaCorte: Date): ResumenMensual {
  const mesInfo = mesRelativo(fechaCorte, 0);
  const inicioMes = primerDiaMes(mesInfo);
  const finMes = ultimoDiaMes(mesInfo);
  const hoy = new Date();
  const esCorteHoy =
    fechaCorte.getFullYear() === hoy.getFullYear() &&
    fechaCorte.getMonth() === hoy.getMonth() &&
    fechaCorte.getDate() === hoy.getDate();

  const cobradoDelMes: MontoConteo = { monto: 0, count: 0 };
  const venceHoy: MontoConteoSistemas = { monto: 0, count: 0, sistemas: 0 };
  const vencidosEsteMes: MontoConteoSistemas = { monto: 0, count: 0, sistemas: 0 };
  const proximoAVencer: MontoConteoSistemas = { monto: 0, count: 0, sistemas: 0 };

  for (const c of todos) {
    const clase = claseCobranzaMes(c, fechaCorte, inicioMes, finMes);
    if (clase === null) continue;

    if (clase === "pagado") {
      const comp = comprobanteVinculado(c, inicioMes, finMes)!;
      cobradoDelMes.monto += comp.total - comp.deuda;
      cobradoDelMes.count += 1;
      continue;
    }

    const monto = montoRealCiclo(c) ?? 0;
    const sistemas = c.sistemas.apiWorking;
    const grupo = clase === "vencido_este_mes" ? vencidosEsteMes : clase === "vence_hoy" ? venceHoy : proximoAVencer;
    grupo.monto += monto;
    grupo.count += 1;
    grupo.sistemas += sistemas;
  }

  const porCobrarDelMes: MontoConteoSistemas = {
    monto: vencidosEsteMes.monto + venceHoy.monto + proximoAVencer.monto,
    count: vencidosEsteMes.count + venceHoy.count + proximoAVencer.count,
    sistemas: vencidosEsteMes.sistemas + venceHoy.sistemas + proximoAVencer.sistemas,
  };
  const esperadoTotalDelMes: MontoConteo = {
    monto: cobradoDelMes.monto + porCobrarDelMes.monto,
    count: cobradoDelMes.count + porCobrarDelMes.count,
  };

  return {
    mesInfo,
    fechaCorte,
    esCorteHoy,
    cobradoDelMes,
    venceHoy,
    vencidosEsteMes,
    proximoAVencer,
    porCobrarDelMes,
    esperadoTotalDelMes,
    pagosGeneralesDelMes: pagosGeneralesDelMes(todos, mesInfo),
  };
}

// ---------------------------------------------------------------------------
// Avisos secundarios — siempre aparte, nunca mezclados en el resumen del mes.
// ---------------------------------------------------------------------------

export function resumenAnclaPendiente(todos: PostVentaCliente[]): MontoConteo & { clientes: PostVentaCliente[] } {
  const clientes = todos.filter(esAnclaPendiente);
  return { monto: clientes.reduce((s, c) => s + (montoRealCiclo(c) ?? 0), 0), count: clientes.length, clientes };
}

// Estado no genera ingreso (demo/inactivo/pendiente de activacion, etc):
// nunca se proyecta, se muestra "hasta su ultimo comprobante" (deudaTotal
// actual, no un monto de ciclo proyectado).
export function resumenSinIngresos(todos: PostVentaCliente[]): MontoConteo & { clientes: PostVentaCliente[] } {
  const clientes = todos.filter(esSinIngresos);
  return { monto: clientes.reduce((s, c) => s + c.deudaTotal, 0), count: clientes.length, clientes };
}

// Vencido de un ciclo ANTERIOR al mes seleccionado — nunca mezclado con
// "vencidos este mes".
export function resumenDeudaArrastrada(
  todos: PostVentaCliente[],
  inicioMes: Date
): MontoConteoSistemas & { clientes: PostVentaCliente[] } {
  const clientes = todos.filter(
    (c) =>
      esProblema(c) &&
      esProyeccionConfiable(c) &&
      c.vencidoDesde !== null &&
      new Date(c.vencidoDesde).getTime() < inicioMes.getTime()
  );
  return {
    monto: clientes.reduce((s, c) => s + (montoRealCiclo(c) ?? 0), 0),
    count: clientes.length,
    sistemas: clientes.reduce((s, c) => s + c.sistemas.apiWorking, 0),
    clientes,
  };
}

export function contarSinDato(todos: PostVentaCliente[]): number {
  return todos.filter((c) => !esProyeccionConfiable(c) && !esAnclaPendiente(c) && !esSinIngresos(c) && !esProblema(c))
    .length;
}

// ---------------------------------------------------------------------------
// Lista de cobranza — texto de dias vencidos/restantes coherente con la
// fecha de CORTE elegida (no con "hoy" real), salvo para clientes en
// problema, donde se reutiliza el campo ya validado diasVencido (siempre
// real-time, igual que en Alertas/Clientes).
// ---------------------------------------------------------------------------

export function textoDiasParaClase(
  cliente: PostVentaCliente,
  clase: ClaseCobranzaMes,
  fechaCorte: Date
): string {
  if (clase === "pagado") return "—";
  if (clase === "vence_hoy") return "Vence hoy";
  if (esProblema(cliente)) {
    return cliente.diasVencido !== null ? `Vencido hace ${cliente.diasVencido} día(s)` : "Vencido";
  }
  const iso = cliente.proximaRenovacion;
  if (!iso) return "—";
  const dias = diasRelativosACorte(iso, fechaCorte);
  return clase === "vencido_este_mes" ? `Vencido hace ${dias} día(s)` : `En ${-dias} día(s)`;
}
