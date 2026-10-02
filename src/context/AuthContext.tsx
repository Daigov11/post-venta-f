import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  checkSession,
  login as loginRequest,
  logout as logoutRequest,
  type RolUsuario,
} from "../services/auth";
import { resetPopupsBolsa } from "../utils/bolsaPopupStorage";

interface AuthContextValue {
  username: string | null;
  rol: RolUsuario | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "pv_username";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [rol, setRol] = useState<RolUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedUsername = localStorage.getItem(STORAGE_KEY);
      const session = await checkSession();
      if (session.authenticated && storedUsername) {
        setUsername(storedUsername);
        setRol(session.rol ?? null);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      setLoading(false);
    })();
  }, []);

  async function login(usuario: string, password: string) {
    const result = await loginRequest({ usuario, password });
    const resolvedUsername =
      (result.nombre as string | undefined) ??
      (result.usuario as string | undefined) ??
      usuario;
    localStorage.setItem(STORAGE_KEY, resolvedUsername);
    setUsername(resolvedUsername);
    setRol(result.rol);
  }

  async function logout() {
    await logoutRequest();
    localStorage.removeItem(STORAGE_KEY);
    setUsername(null);
    setRol(null);
    // Para que un login posterior en la misma pestaña vuelva a mostrar el
    // popup de estado de la bolsa con el estado actualizado, en vez de
    // quedar "ya visto" para siempre en esta sesion de navegador.
    resetPopupsBolsa();
  }

  return (
    <AuthContext.Provider
      value={{ username, rol, isAuthenticated: !!username, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
