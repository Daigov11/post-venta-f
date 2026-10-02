import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import "./App.css";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RequireRol } from "./components/RequireRol";
import { useAuth } from "./context/AuthContext";
import { AlertasPage } from "./pages/Alertas";
import { ClienteFichaPage } from "./pages/ClienteFicha";
import { ClientesPage } from "./pages/Clientes";
import { ConfiguracionPage } from "./pages/Configuracion";
import { DashboardPage } from "./pages/Dashboard";
import { LoginPage } from "./pages/Login";
import { MovimientosPage } from "./pages/Movimientos";
import { OportunidadesPage } from "./pages/Oportunidades";
import { OrdenesPage } from "./pages/Ordenes";
import { RecuperacionPage } from "./pages/Recuperacion";
import { RenovacionesPage } from "./pages/Renovaciones";
import { ReportesPage } from "./pages/Reportes";
import { ReunionesPage } from "./pages/Reuniones";
import { ResultadosPage } from "./pages/Resultados";
import { BolsaPage } from "./pages/Bolsa";
import { TareasPage } from "./pages/Tareas";

const ROLES_TOTAL_ACCESO: ("ADMIN" | "ADMINISTRATIVO")[] = ["ADMIN", "ADMINISTRATIVO"];

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProtectedRoute>
  );
}

// POSTVENTA no tiene una pagina "de inicio" entre los modulos bloqueados,
// asi que una ruta desconocida no debe mandarlo directo a "Acceso
// restringido" en /dashboard.
function RedirectInicio() {
  const { rol } = useAuth();
  return <Navigate to={rol === "POSTVENTA" ? "/clientes" : "/dashboard"} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route
          path="/dashboard"
          element={
            <RequireRol roles={ROLES_TOTAL_ACCESO}>
              <DashboardPage />
            </RequireRol>
          }
        />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/clientes/:numeroDocumentoCliente" element={<ClienteFichaPage />} />
        <Route
          path="/movimientos"
          element={
            <RequireRol roles={ROLES_TOTAL_ACCESO}>
              <MovimientosPage />
            </RequireRol>
          }
        />
        <Route path="/alertas" element={<AlertasPage />} />
        <Route path="/oportunidades" element={<OportunidadesPage />} />
        <Route
          path="/renovaciones"
          element={
            <RequireRol roles={ROLES_TOTAL_ACCESO}>
              <RenovacionesPage />
            </RequireRol>
          }
        />
        <Route path="/tareas" element={<TareasPage />} />
        <Route path="/recuperacion" element={<RecuperacionPage />} />
        <Route
          path="/bolsa"
          element={
            <RequireRol roles={ROLES_TOTAL_ACCESO}>
              <BolsaPage />
            </RequireRol>
          }
        />
        {/* Ruta vieja, ya no en el menu — se deja accesible por URL directa
            para no perder el historico congelado de Resultados (ver
            migracion 0041, "La Bolsa" lo reemplaza en el nav). */}
        <Route
          path="/resultados"
          element={
            <RequireRol roles={ROLES_TOTAL_ACCESO}>
              <ResultadosPage />
            </RequireRol>
          }
        />
        <Route path="/reuniones" element={<ReunionesPage />} />
        <Route
          path="/reportes"
          element={
            <RequireRol roles={ROLES_TOTAL_ACCESO}>
              <ReportesPage />
            </RequireRol>
          }
        />
        <Route
          path="/configuracion"
          element={
            <RequireRol roles={ROLES_TOTAL_ACCESO}>
              <ConfiguracionPage />
            </RequireRol>
          }
        />
        <Route
          path="/ordenes"
          element={
            <RequireRol roles={ROLES_TOTAL_ACCESO}>
              <OrdenesPage />
            </RequireRol>
          }
        />
      </Route>
      <Route path="*" element={<RedirectInicio />} />
    </Routes>
  );
}

export default App;
