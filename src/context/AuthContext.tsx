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
} from "../services/auth";

interface AuthContextValue {
  username: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "pv_username";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedUsername = localStorage.getItem(STORAGE_KEY);
      const isValid = await checkSession();
      if (isValid && storedUsername) {
        setUsername(storedUsername);
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
  }

  async function logout() {
    await logoutRequest();
    localStorage.removeItem(STORAGE_KEY);
    setUsername(null);
  }

  return (
    <AuthContext.Provider
      value={{ username, isAuthenticated: !!username, loading, login, logout }}
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
