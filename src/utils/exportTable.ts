export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

// xlsx (SheetJS) y jspdf solo se usan acá para ESCRIBIR datos propios que ya
// están en memoria (nunca para leer/parsear un archivo subido por el
// usuario) — las vulnerabilidades conocidas de xlsx son todas sobre el
// parseo de hojas de cálculo ajenas, no aplican a este uso.
//
// Import dinámico a proposito: jspdf arrastra html2canvas/dompurify (~250kB
// minificado) que ninguna otra pantalla necesita — sin esto se sumaba al
// bundle principal de toda la app. Con import() queda en un chunk aparte que
// solo se descarga la primera vez que alguien exporta a PDF.
export async function exportarExcel<T>(nombreArchivo: string, columnas: ExportColumn<T>[], filas: T[]) {
  const XLSX = await import("xlsx");
  const datos = filas.map((fila) => {
    const obj: Record<string, string | number> = {};
    for (const columna of columnas) obj[columna.header] = columna.value(fila);
    return obj;
  });
  const hoja = XLSX.utils.json_to_sheet(datos);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Datos");
  XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
}

export async function exportarPdf<T>(
  nombreArchivo: string,
  titulo: string,
  columnas: ExportColumn<T>[],
  filas: T[]
) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: columnas.length > 6 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(titulo, 14, 16);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString("es-PE"), 14, 22);
  autoTable(doc, {
    startY: 27,
    head: [columnas.map((c) => c.header)],
    body: filas.map((fila) => columnas.map((c) => String(c.value(fila)))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(`${nombreArchivo}.pdf`);
}
