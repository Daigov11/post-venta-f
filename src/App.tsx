import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import "./App.css";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AlertasPage } from "./pages/Alertas";
import { ClienteFichaPage } from "./pages/ClienteFicha";
import { ClientesPage } from "./pages/Clientes";
import { ConfiguracionPage } from "./pages/Configuracion";
import { DashboardPage } from "./pages/Dashboard";
import { LoginPage } from "./pages/Login";
import { OportunidadesPage } from "./pages/Oportunidades";
import { OrdenesPage } from "./pages/Ordenes";
import { RenovacionesPage } from "./pages/Renovaciones";
import { ReportesPage } from "./pages/Reportes";
import { TareasPage } from "./pages/Tareas";

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/clientes/:numeroDocumentoCliente" element={<ClienteFichaPage />} />
        <Route path="/alertas" element={<AlertasPage />} />
        <Route path="/oportunidades" element={<OportunidadesPage />} />
        <Route path="/renovaciones" element={<RenovacionesPage />} />
        <Route path="/tareas" element={<TareasPage />} />
        <Route path="/reportes" element={<ReportesPage />} />
        <Route path="/configuracion" element={<ConfiguracionPage />} />
        <Route path="/ordenes" element={<OrdenesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
