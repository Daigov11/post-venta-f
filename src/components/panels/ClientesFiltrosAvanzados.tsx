import { FilterBar } from "../ui/FilterBar";

// "Mas filtros" de Cartera: campos que casi nadie toca a diario (rango de
// antiguedad/comprobantes/ingresos, texto libre de plan/ejecutivo/etc.) —
// separado de Clientes.tsx para no cargar ese archivo con 15 campos que solo
// se ven cuando showMoreFilters esta activo.
export interface FiltrosAvanzadosValues {
  conEquipo: string;
  documentacionCompleta: string;
  plan: string;
  ejecutivo: string;
  tipoOS: string;
  distribuidor: string;
  departamento: string;
  antiguedadMesesMin: string;
  antiguedadMesesMax: string;
  comprobantesMin: string;
  comprobantesMax: string;
  ingresosMensualesMin: string;
  ingresosMensualesMax: string;
}

export function ClientesFiltrosAvanzados({
  values,
  onChange,
  onLimpiar,
}: {
  values: FiltrosAvanzadosValues;
  onChange: <K extends keyof FiltrosAvanzadosValues>(key: K, value: string) => void;
  onLimpiar: () => void;
}) {
  return (
    <FilterBar>
      <div className="field">
        <label htmlFor="filtro-equipo">Equipo</label>
        <select
          id="filtro-equipo"
          value={values.conEquipo}
          onChange={(e) => onChange("conEquipo", e.target.value)}
        >
          <option value="">Todos</option>
          <option value="true">Con equipo</option>
          <option value="false">Sin equipo</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="filtro-doc">Documentación</label>
        <select
          id="filtro-doc"
          value={values.documentacionCompleta}
          onChange={(e) => onChange("documentacionCompleta", e.target.value)}
        >
          <option value="">Todas</option>
          <option value="true">Completa</option>
          <option value="false">Incompleta</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="filtro-plan">Plan</label>
        <input
          id="filtro-plan"
          value={values.plan}
          onChange={(e) => onChange("plan", e.target.value)}
          placeholder="Nombre exacto del plan"
        />
      </div>
      <div className="field">
        <label htmlFor="filtro-ejecutivo">Ejecutivo</label>
        <input
          id="filtro-ejecutivo"
          value={values.ejecutivo}
          onChange={(e) => onChange("ejecutivo", e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="filtro-tipoos">Tipo OS</label>
        <input id="filtro-tipoos" value={values.tipoOS} onChange={(e) => onChange("tipoOS", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="filtro-distribuidor">Vendedor/Distribuidor</label>
        <input
          id="filtro-distribuidor"
          value={values.distribuidor}
          onChange={(e) => onChange("distribuidor", e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="filtro-departamento">Departamento</label>
        <input
          id="filtro-departamento"
          value={values.departamento}
          onChange={(e) => onChange("departamento", e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="filtro-ant-min">Antigüedad mín. (meses)</label>
        <input
          id="filtro-ant-min"
          type="number"
          min={0}
          value={values.antiguedadMesesMin}
          onChange={(e) => onChange("antiguedadMesesMin", e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="filtro-ant-max">Antigüedad máx. (meses)</label>
        <input
          id="filtro-ant-max"
          type="number"
          min={0}
          value={values.antiguedadMesesMax}
          onChange={(e) => onChange("antiguedadMesesMax", e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="filtro-comp-min">Comprobantes mín.</label>
        <input
          id="filtro-comp-min"
          type="number"
          min={0}
          value={values.comprobantesMin}
          onChange={(e) => onChange("comprobantesMin", e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="filtro-comp-max">Comprobantes máx.</label>
        <input
          id="filtro-comp-max"
          type="number"
          min={0}
          value={values.comprobantesMax}
          onChange={(e) => onChange("comprobantesMax", e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="filtro-ingreso-min">Ingresos mensuales mín. (S/)</label>
        <input
          id="filtro-ingreso-min"
          type="number"
          min={0}
          value={values.ingresosMensualesMin}
          onChange={(e) => onChange("ingresosMensualesMin", e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="filtro-ingreso-max">Ingresos mensuales máx. (S/)</label>
        <input
          id="filtro-ingreso-max"
          type="number"
          min={0}
          value={values.ingresosMensualesMax}
          onChange={(e) => onChange("ingresosMensualesMax", e.target.value)}
        />
      </div>
      <button type="button" className="btn btn-ghost" onClick={onLimpiar}>
        Limpiar filtros
      </button>
    </FilterBar>
  );
}
