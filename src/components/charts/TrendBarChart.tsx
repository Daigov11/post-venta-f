import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface TrendPoint {
  label: string;
  value: number;
}

// Mismo criterio que CategoryBarChart: un solo tono secuencial (identidad de
// la serie la da el titulo de la seccion, no el color) — evita inventar una
// paleta categorica sin validar (ver design/tokens.css --chart-sequential).
export function TrendBarChart({ data, color = "#16a34a" }: { data: TrendPoint[]; color?: string }) {
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
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
        <Tooltip
          cursor={{ fill: "var(--color-surface-hover)" }}
          contentStyle={{
            borderRadius: 8,
            borderColor: "var(--color-border)",
            fontSize: 13,
          }}
        />
        <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
