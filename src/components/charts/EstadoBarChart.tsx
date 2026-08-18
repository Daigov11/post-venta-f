import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Paleta validada con scripts/validate_palette.js (skill dataviz) para este
// trio de marcas — ver design/tokens.css --chart-good/--chart-warning/--chart-critical.
const STATUS_COLOR: Record<string, string> = {
  NORMAL: "#0ca30c",
  REVISAR: "#fab219",
  ATENCION: "#d03b3b",
};

const STATUS_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  REVISAR: "Revisar",
  ATENCION: "Atención",
};

export function EstadoBarChart({
  data,
}: {
  data: { NORMAL: number; REVISAR: number; ATENCION: number };
}) {
  const rows = (["NORMAL", "REVISAR", "ATENCION"] as const).map((estado) => ({
    estado: STATUS_LABEL[estado],
    key: estado,
    count: data[estado],
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <XAxis
          dataKey="estado"
          tickLine={false}
          axisLine={{ stroke: "var(--color-border)" }}
          fontSize={12}
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
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {rows.map((row) => (
            <Cell key={row.key} fill={STATUS_COLOR[row.key]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
