// Recuerda, SOLO para esta pestaña/sesion de navegador (sessionStorage, no
// localStorage), que ya se mostro el popup de estado de la bolsa — el
// backend sigue siendo la fuente de verdad del estado en si (nunca se
// guarda el estado de la bolsa aca, solo si el popup ya aparecio). Se
// limpia al cerrar sesion (ver AuthContext.logout) para que un login nuevo
// en la MISMA pestaña vuelva a mostrarlo, tal como se pidio.
const PREFIX = "bolsa_popup_mostrado_";

function clave(usuario: string): string {
  return `${PREFIX}${usuario}`;
}

export function yaSeMostroPopupBolsa(usuario: string): boolean {
  try {
    return sessionStorage.getItem(clave(usuario)) === "1";
  } catch {
    return false;
  }
}

export function marcarPopupBolsaMostrado(usuario: string): void {
  try {
    sessionStorage.setItem(clave(usuario), "1");
  } catch {
    // sessionStorage bloqueado (modo privado, etc.) — no es critico, el
    // popup podria volver a aparecer, nada mas.
  }
}

// Se llama al hacer logout — asi un login posterior en la misma pestaña
// vuelve a mostrar el popup con el estado actualizado, en vez de quedar
// "ya mostrado" para siempre dentro de la misma sesion de navegador.
export function resetPopupsBolsa(): void {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // idem — no critico.
  }
}
