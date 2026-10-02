import { createContacto } from "../services/contactos";
import type { ActionMenuItem } from "../components/ui/ActionMenu";

// Construye los items "Llamar"/"WhatsApp" para ActionMenu — mismo
// comportamiento que LlamarButton/WhatsAppButton (abre tel:/wa.me real +
// registra el contacto fire-and-forget), reutilizado desde cualquier modulo
// que consolide sus acciones en un ⚙ en vez de esos botones sueltos.
export function buildContactoMenuItems(params: {
  numeroDocumentoCliente: string;
  idOrdenServicio?: number | null;
  telefonoLimpio: string | null | undefined;
}): ActionMenuItem[] {
  const { numeroDocumentoCliente, idOrdenServicio, telefonoLimpio } = params;
  if (!telefonoLimpio) return [];
  const limpio = telefonoLimpio.replace(/\D/g, "");
  if (!limpio) return [];

  return [
    {
      key: "llamar",
      label: "Llamar",
      href: `tel:${limpio}`,
      onSelect: () => {
        createContacto({
          numeroDocumentoCliente,
          idOrdenServicio: idOrdenServicio ?? null,
          canal: "LLAMADA",
        }).catch(() => {});
      },
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/51${limpio}`,
      target: "_blank",
      onSelect: () => {
        createContacto({
          numeroDocumentoCliente,
          idOrdenServicio: idOrdenServicio ?? null,
          canal: "WHATSAPP",
        }).catch(() => {});
      },
    },
  ];
}
