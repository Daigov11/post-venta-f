import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface AccionesTrendPoint {
  label: string;
  realizadas: number;
  noRealizadas: number;
}

const LEGEND_LABEL: Record<string, string> = {
  realizadas: "Realizadas",
  noRealizadas: "No realizadas",
};

// Mismos hex que EstadoBarChart (design/tokens.css --chart-good/--chart-warning)
// — realizadas se lee como "logrado" y no realizadas como "pendiente de
// atencion", mismo par ya validado ahi para ese contraste.
export function AccionesTrendChart({ data }: { data: AccionesTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: "var(--color-border)" }}
          fontSize={11}
          interval="preserveStartEnd"
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={32} />
        <Tooltip
          cursor={{ fill: "var(--color-surface-hover)" }}
          contentStyle={{
            borderRadius: 8,
            borderColor: "var(--color-border)",
            fontSize: 13,
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value: string) => LEGEND_LABEL[value] ?? value}
        />
        <Bar dataKey="realizadas" fill="#0ca30c" radius={[3, 3, 0, 0]} maxBarSize={18} />
        <Bar dataKey="noRealizadas" fill="#fab219" radius={[3, 3, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
