import { useEffect, useState, type FormEvent } from "react";
import { Skeleton } from "../components/ui/Skeleton";
import { useConfig } from "../hooks/useConfig";
import { refreshPostVentaCache } from "../services/dashboard";
import { updateConfig } from "../services/config";
import {
  refreshSystemUsersAll,
  type RefreshSystemUsersAllResult,
} from "../services/clientes";
import type { PostVentaConfigValues } from "../types/postventaCliente";
import "./Configuracion.css";

const CONFIG_FIELDS: {
  key: keyof PostVentaConfigValues;
  label: string;
  description: string;
  type: "number" | "date" | "text";
}[] = [
  {
    key: "estado.deuda_atencion_min",
    label: "Deuda mínima para estado Atención",
    description: "Deuda total (S/) a partir de la cual un cliente pasa a estado Atención.",
    type: "number",
  },
  {
    key: "estado.documentacion_completa_min",
    label: "% de documentación mínimo",
    description: "Porcentaje de documentación por debajo del cual el cliente pasa a Revisar.",
    type: "number",
  },
  {
    key: "alerta.deuda_min",
    label: "Deuda mínima para alerta",
    description: "Deuda total (S/) a partir de la cual se genera una alerta de deuda pendiente.",
    type: "number",
  },
  {
    key: "alerta.antiguedad_aniversario_meses",
    label: "Ciclo de aniversario (meses)",
    description: "Cada cuántos meses de antigüedad se genera una alerta de aniversario.",
    type: "number",
  },
  {
    key: "oportunidad.cliente_antiguo_meses_min",
    label: "Antigüedad mínima — cliente antiguo (meses)",
    description: "Meses de antigüedad para considerar oportunidad de cliente antiguo.",
    type: "number",
  },
  {
    key: "oportunidad.alto_volumen_comprobantes_min",
    label: "Volumen mínimo de comprobantes",
    description: "Cantidad histórica de comprobantes mínima para oportunidad de alto volumen.",
    type: "number",
  },
  {
    key: "sync.fecha_inicio",
    label: "Fecha de inicio del dataset",
    description: "Ventana de arranque usada para traer el listado completo de órdenes de servicio.",
    type: "date",
  },
  {
    key: "renovacion.alerta_mensual_dias",
    label: "Renovación — aviso planes mensuales (días)",
    description: "Días de anticipación para alertar el próximo vencimiento de pago en planes mensuales.",
    type: "number",
  },
  {
    key: "renovacion.alerta_trimestral_dias",
    label: "Renovación — aviso planes trimestrales (días)",
    description: "Días de anticipación para alertar el próximo vencimiento de pago en planes trimestrales.",
    type: "number",
  },
  {
    key: "renovacion.alerta_semestral_dias",
    label: "Renovación — aviso planes semestrales (días)",
    description: "Días de anticipación para alertar el próximo vencimiento de pago en planes semestrales.",
    type: "number",
  },
  {
    key: "renovacion.alerta_anual_dias",
    label: "Renovación — aviso planes anuales (días)",
    description: "Días de anticipación para alertar el próximo vencimiento de pago en planes anuales.",
    type: "number",
  },
  {
    key: "sync.post_venta_fecha_inicio",
    label: "Fecha de inicio — endpoint de facturación",
    description:
      "Ventana de arranque para Administrativo/post-venta (nombre comercial, ingresos, comprobantes mensuales, SUNAT). Fechas anteriores al 25-09-2022 fallan del lado de APIWorking, no reducir sin confirmar antes.",
    type: "date",
  },
  {
    key: "actividad.dias_sin_uso_alerta",
    label: "Alerta de inactividad (días)",
    description:
      "Días sin señal de actividad en el sistema del cliente a partir de los cuales se alerta posible desuso, sin importar el segmento de pago.",
    type: "number",
  },
  {
    key: "seguimiento.dias_etapa2",
    label: "Seguimiento post venta — días para etapa 2",
    description:
      "Días desde la etapa 1 (bienvenida) para que corresponda la etapa 2 de seguimiento del onboarding.",
    type: "number",
  },
  {
    key: "seguimiento.dias_etapa3",
    label: "Seguimiento post venta — días para etapa 3",
    description:
      "Días desde la etapa 2 para que corresponda la etapa 3 (última ronda) de seguimiento del onboarding.",
    type: "number",
  },
  {
    key: "seguimiento.fecha_corte_clientes_nuevos",
    label: "Seguimiento post venta — fecha de corte",
    description:
      "Clientes con fecha de inicio a partir de esta fecha entran solos al flujo automático de seguimiento post venta. Los anteriores ya fueron seguidos a mano (importados del Excel de Ligia).",
    type: "date",
  },
  {
    key: "dataset.estados_excluidos",
    label: "Estados excluidos del conteo",
    description:
      "Estados de APIWorking (nEstado) separados por coma que se excluyen de todo el dataset — dashboard, cuadro de clientes, alertas y oportunidades (ej. clientes desactivados).",
    type: "text",
  },
  {
    key: "segmento.diamante_max_dias",
    label: "Segmento Diamante — días máx. de atraso",
    description:
      "Días entre el vencimiento del ciclo y la factura que lo cubre para clasificar Diamante.",
    type: "number",
  },
  {
    key: "segmento.oro_max_dias",
    label: "Segmento Oro — días máx. de atraso",
    description: "Días máximos de atraso para clasificar Oro.",
    type: "number",
  },
  {
    key: "segmento.plata_max_dias",
    label: "Segmento Plata — días máx. de atraso",
    description:
      "Días máximos de atraso para clasificar Plata. Más que esto, o deuda pendiente, es Crítico.",
    type: "number",
  },
];

export function ConfiguracionPage() {
  const { data, loading, error, refetch } = useConfig();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingTrabajadores, setRefreshingTrabajadores] = useState(false);
  const [trabajadoresResult, setTrabajadoresResult] =
    useState<RefreshSystemUsersAllResult | null>(null);

  useEffect(() => {
    if (!data) return;
    const initial: Record<string, string> = {};
    for (const field of CONFIG_FIELDS) {
      initial[field.key] = String(data[field.key]);
    }
    setValues(initial);
  }, [data]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSavedMessage(false);
    try {
      await updateConfig(values as Partial<Record<keyof PostVentaConfigValues, string>>);
      setSavedMessage(true);
      refetch();
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshPostVentaCache();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRefreshTrabajadores() {
    setRefreshingTrabajadores(true);
    setTrabajadoresResult(null);
    try {
      const result = await refreshSystemUsersAll();
      setTrabajadoresResult(result);
    } finally {
      setRefreshingTrabajadores(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Configuración</h1>
          <div className="page-header-subtitle">
            Umbrales que controlan estados, alertas y oportunidades
          </div>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading && !data && (
        <div className="card config-form">
          <Skeleton height={60} />
          <Skeleton height={60} />
          <Skeleton height={60} />
        </div>
      )}

      {data && (
        <form className="card config-form" onSubmit={handleSubmit}>
          {CONFIG_FIELDS.map((field) => (
            <div className="config-field" key={field.key}>
              <label htmlFor={field.key}>{field.label}</label>
              <input
                id={field.key}
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                step={field.type === "number" ? "0.01" : undefined}
                value={values[field.key] ?? ""}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                }
              />
              <span className="config-field-description">{field.description}</span>
            </div>
          ))}

          <div className="config-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? "Actualizando..." : "Forzar actualización del dataset"}
            </button>
            {savedMessage && <span className="config-saved-msg">Cambios guardados.</span>}
          </div>
        </form>
      )}

      <div className="card config-form">
        <h2>N° de trabajadores</h2>
        <p className="muted">
          Se aproxima con la cantidad de usuarios registrados en el sistema propio de cada
          cliente. Recorre toda la cartera contra APIWorking, puede tardar varios minutos.
        </p>
        <div className="config-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRefreshTrabajadores}
            disabled={refreshingTrabajadores}
          >
            {refreshingTrabajadores
              ? "Actualizando toda la cartera..."
              : "Actualizar N° de trabajadores (todos)"}
          </button>
          {trabajadoresResult && (
            <span className="config-saved-msg">
              {trabajadoresResult.exitosos} de {trabajadoresResult.totalClientes} clientes
              actualizados ({trabajadoresResult.fallidos} sin datos disponibles).
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
