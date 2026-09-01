import { useState } from "react";
import "../forms/forms.css";

const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// Calendario visual para elegir una fecha — reemplaza el <input type="date">
// nativo por el mismo patron ya usado en otros productos
// (pagos.apiworking.com.pe): grilla de mes con navegacion, domingos y fechas
// pasadas deshabilitados directamente en la celda (no hace falta el aviso de
// texto aparte que tenia el input nativo). Compartido entre el formulario de
// agendar reunion y la pantalla de Reuniones (asignar horario).
export function CalendarioFecha({
  fecha,
  onSelect,
}: {
  fecha: string;
  onSelect: (iso: string) => void;
}) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicial = fecha ? new Date(`${fecha}T00:00:00`) : hoy;
  const [mesVista, setMesVista] = useState(
    () => new Date(inicial.getFullYear(), inicial.getMonth(), 1)
  );

  const anio = mesVista.getFullYear();
  const mes = mesVista.getMonth();
  const offset = (new Date(anio, mes, 1).getDay() + 6) % 7; // 0 = lunes
  const totalDias = new Date(anio, mes + 1, 0).getDate();
  const enMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth();

  const celdas: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ];

  return (
    <div className="calendario-fecha">
      <div className="calendario-fecha-header">
        <button
          type="button"
          className="calendario-fecha-nav"
          onClick={() => setMesVista((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          disabled={enMesActual}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <strong style={{ textTransform: "capitalize" }}>
          {MESES[mes]} {anio}
        </strong>
        <button
          type="button"
          className="calendario-fecha-nav"
          onClick={() => setMesVista((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>
      <div className="calendario-fecha-dow">
        {DIAS_SEMANA.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="calendario-fecha-grid">
        {celdas.map((dia, i) => {
          if (dia === null) return <span key={`vacio-${i}`} />;
          const iso = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const fechaCelda = new Date(anio, mes, dia);
          const deshabilitado = fechaCelda < hoy || fechaCelda.getDay() === 0;
          return (
            <button
              key={iso}
              type="button"
              className={`calendario-fecha-dia${iso === fecha ? " seleccionado" : ""}`}
              disabled={deshabilitado}
              onClick={() => onSelect(iso)}
            >
              {dia}
            </button>
          );
        })}
      </div>
      <p className="muted calendario-fecha-nota">Los domingos no hay atención.</p>
    </div>
  );
}
