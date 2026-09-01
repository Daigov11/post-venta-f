import { createLlamada } from "../../services/llamadas";

// Boton "Llamar" compartido — ademas de abrir tel:, deja registrado que
// alguien del equipo hizo clic para llamar a este cliente (fire-and-forget,
// no bloquea ni interrumpe el tel: si falla el registro).
export function LlamarButton({
  numeroDocumentoCliente,
  idOrdenServicio,
  telefonoLimpio,
  className,
}: {
  numeroDocumentoCliente: string;
  idOrdenServicio?: number | null;
  telefonoLimpio: string;
  className?: string;
}) {
  return (
    <a
      className={className ?? "btn btn-secondary"}
      href={`tel:${telefonoLimpio}`}
      onClick={() => {
        createLlamada({
          numeroDocumentoCliente,
          idOrdenServicio: idOrdenServicio ?? null,
        }).catch(() => {});
      }}
    >
      Llamar
    </a>
  );
}
