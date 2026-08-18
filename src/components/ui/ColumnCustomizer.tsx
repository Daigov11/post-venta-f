import { useState } from "react";
import "./ui.css";

export interface ColumnOption {
  key: string;
  label: string;
}

export function ColumnCustomizer({
  columns,
  visible,
  onChange,
}: {
  columns: ColumnOption[];
  visible: string[];
  onChange: (visible: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(key: string) {
    if (visible.includes(key)) {
      onChange(visible.filter((k) => k !== key));
    } else {
      onChange([...visible, key]);
    }
  }

  return (
    <div className="column-customizer">
      <button type="button" className="btn btn-secondary" onClick={() => setOpen((o) => !o)}>
        Personalizar columnas
      </button>
      {open && (
        <div className="card column-customizer-panel">
          {columns.map((col) => (
            <label key={col.key} className="column-customizer-option">
              <input
                type="checkbox"
                checked={visible.includes(col.key)}
                onChange={() => toggle(col.key)}
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
