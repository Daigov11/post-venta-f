import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import "./ActionMenu.css";

export interface ActionMenuItem {
  key: string;
  label: string;
  /** Ruta interna (react-router) — se renderiza como <Link> real. */
  to?: string;
  /** Enlace real (tel:, wa.me, etc.) — se renderiza como <a> real. */
  href?: string;
  target?: string;
  /** Efecto propio del item (ademas de navegar, o en vez de navegar). */
  onSelect?: () => void;
  disabled?: boolean;
}

// Menu flotante generico para consolidar las acciones de una fila detras de
// un unico boton ⚙. Se renderiza vía portal a document.body y se posiciona
// con position:fixed calculado desde el boton — evita que .data-table-wrapper
// (overflow-x:auto) lo recorte, algo que un position:absolute normal
// sufriria dentro de una tabla con scroll horizontal.
export function ActionMenu({ label, items }: { label: string; items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(true);
  }

  function closeMenu(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  // Recorta contra los bordes del viewport una vez que el panel ya tiene
  // dimensiones reales (no se puede saber el alto/ancho de antemano, depende
  // de cuantos items y que tan largos son sus labels).
  useLayoutEffect(() => {
    if (!open || !coords || !menuRef.current || !buttonRef.current) return;
    const menuRect = menuRef.current.getBoundingClientRect();
    const buttonRect = buttonRef.current.getBoundingClientRect();
    let { top, left } = coords;
    const margin = 8;

    if (left + menuRect.width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - menuRect.width);
    }
    if (top + menuRect.height > window.innerHeight - margin) {
      // No entra abajo del boton — se abre hacia arriba en su lugar.
      top = Math.max(margin, buttonRect.top - menuRect.height - 4);
    }
    if (top !== coords.top || left !== coords.left) {
      setCoords({ top, left });
    }
    // Solo se recalcula cuando cambian las coords "crudas" iniciales, no en
    // cada render (evita un loop infinito de setCoords).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, menuRef.current, coords?.top, coords?.left]);

  useEffect(() => {
    if (!open) return;

    const enabled = itemRefs.current.filter((el): el is HTMLElement => !!el);
    enabled[0]?.focus();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      closeMenu(false);
    }
    function handleScrollOrResize() {
      closeMenu(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleButtonKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      event.preventDefault();
      openMenu();
    }
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const enabled = itemRefs.current.filter((el): el is HTMLElement => !!el);
    const currentIndex = enabled.indexOf(document.activeElement as HTMLElement);

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      enabled[(currentIndex + 1) % enabled.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      enabled[(currentIndex - 1 + enabled.length) % enabled.length]?.focus();
    } else if (event.key === "Tab") {
      // Patron ARIA "menu button": Tab sale del menu (no navega items), asi
      // que lo cerramos para no dejarlo flotando sin foco adentro.
      closeMenu(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="action-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={handleButtonKeyDown}
      >
        ⚙
      </button>
      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            className="action-menu-panel"
            style={{ top: coords.top, left: coords.left }}
            onKeyDown={handleMenuKeyDown}
          >
            {items.map((item, index) => {
              const setRef = (el: HTMLElement | null) => {
                itemRefs.current[index] = item.disabled ? null : el;
              };
              if (item.disabled) {
                return (
                  <span key={item.key} role="menuitem" aria-disabled="true" className="action-menu-item">
                    {item.label}
                  </span>
                );
              }
              if (item.to) {
                return (
                  <Link
                    key={item.key}
                    role="menuitem"
                    className="action-menu-item"
                    to={item.to}
                    ref={setRef}
                    onClick={() => closeMenu(false)}
                  >
                    {item.label}
                  </Link>
                );
              }
              if (item.href) {
                return (
                  <a
                    key={item.key}
                    role="menuitem"
                    className="action-menu-item"
                    href={item.href}
                    target={item.target}
                    rel={item.target === "_blank" ? "noreferrer" : undefined}
                    ref={setRef}
                    onClick={() => {
                      item.onSelect?.();
                      closeMenu(false);
                    }}
                  >
                    {item.label}
                  </a>
                );
              }
              return (
                <button
                  key={item.key}
                  role="menuitem"
                  type="button"
                  className="action-menu-item"
                  ref={setRef}
                  onClick={() => {
                    closeMenu(true);
                    item.onSelect?.();
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
