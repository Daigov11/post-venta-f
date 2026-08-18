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
