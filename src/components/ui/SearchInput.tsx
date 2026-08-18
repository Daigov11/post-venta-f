import { useEffect, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import "./ui.css";

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  const debounced = useDebounce(local, 350);

  useEffect(() => {
    onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <input
      type="search"
      className="search-input"
      value={local}
      onChange={(event) => setLocal(event.target.value)}
      placeholder={placeholder ?? "Buscar..."}
    />
  );
}
