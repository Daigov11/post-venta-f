export function ExportButtons({
  onExcel,
  onPdf,
  disabled,
}: {
  onExcel: () => void;
  onPdf: () => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button type="button" className="btn btn-secondary" onClick={onExcel} disabled={disabled}>
        Excel
      </button>
      <button type="button" className="btn btn-secondary" onClick={onPdf} disabled={disabled}>
        PDF
      </button>
    </div>
  );
}
