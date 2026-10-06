const currencyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});
const numberFormatter = new Intl.NumberFormat("es-PE");

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatValorEstimado(value: number | "No determinado"): string {
  return value === "No determinado" ? value : formatCurrency(value);
}

// "2026-09-01" -> "01 / 09 / 26". Se parte el texto a mano en vez de usar
// Date: un Date de "YYYY-MM-DD" se interpreta en UTC y en Lima mostraria el
// dia anterior.
export function formatFechaCorta(iso: string | null | undefined, vacio = "—"): string {
  if (!iso) return vacio;
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return iso;
  return `${dia} / ${mes} / ${anio.slice(-2)}`;
}
