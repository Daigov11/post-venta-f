import { createContacto } from "../../services/contactos";

// Boton "WhatsApp" compartido — siempre abre en pestaña nueva (target
// _blank, no reemplaza la pantalla actual) y deja registrado que alguien del
// equipo se comunico por este canal (fire-and-forget, no bloquea el enlace
// si falla el registro). Ver LlamarButton para el equivalente por llamada.
export function WhatsAppButton({
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
      href={`https://wa.me/51${telefonoLimpio}`}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        createContacto({
          numeroDocumentoCliente,
          idOrdenServicio: idOrdenServicio ?? null,
          canal: "WHATSAPP",
        }).catch(() => {});
      }}
    >
      WhatsApp
    </a>
  );
}
