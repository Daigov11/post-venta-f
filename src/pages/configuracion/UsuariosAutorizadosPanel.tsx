import { useState, type FormEvent } from "react";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { extractErrorMessage } from "../../hooks/useAsyncData";
import { useUsuariosAutorizados } from "../../hooks/useUsuariosAutorizados";
import type { RolUsuario } from "../../services/auth";
import {
  actualizarUsuarioAutorizado,
  crearUsuarioAutorizado,
  type UsuarioAutorizado,
} from "../../services/usuariosAutorizados";

const ROLES: RolUsuario[] = ["ADMIN", "ADMINISTRATIVO", "POSTVENTA"];

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

export function UsuariosAutorizadosPanel() {
  const { data, loading, error, refetch } = useUsuariosAutorizados();
  const [usuarioExterno, setUsuarioExterno] = useState("");
  const [nombreVisible, setNombreVisible] = useState("");
  const [rol, setRol] = useState<RolUsuario>("POSTVENTA");
  const [creando, setCreando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [filaError, setFilaError] = useState<{ id: number; message: string } | null>(null);
  const [actualizandoId, setActualizandoId] = useState<number | null>(null);

  async function handleCrear(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setCreando(true);
    try {
      await crearUsuarioAutorizado({ usuarioExterno, nombreVisible, rol });
      setUsuarioExterno("");
      setNombreVisible("");
      setRol("POSTVENTA");
      refetch();
    } catch (err) {
      setFormError(extractErrorMessage(err, "No se pudo agregar el usuario"));
    } finally {
      setCreando(false);
    }
  }

  async function handleCambiarRol(usuario: UsuarioAutorizado, nuevoRol: RolUsuario) {
    setFilaError(null);
    setActualizandoId(usuario.id);
    try {
      await actualizarUsuarioAutorizado(usuario.id, { rol: nuevoRol });
      refetch();
    } catch (err) {
      setFilaError({ id: usuario.id, message: extractErrorMessage(err, "No se pudo cambiar el rol") });
    } finally {
      setActualizandoId(null);
    }
  }

  async function handleToggleActivo(usuario: UsuarioAutorizado) {
    setFilaError(null);
    setActualizandoId(usuario.id);
    try {
      await actualizarUsuarioAutorizado(usuario.id, { activo: !usuario.activo });
      refetch();
    } catch (err) {
      setFilaError({
        id: usuario.id,
        message: extractErrorMessage(err, "No se pudo cambiar el estado"),
      });
    } finally {
      setActualizandoId(null);
    }
  }

  async function handleToggleReparto(usuario: UsuarioAutorizado) {
    setFilaError(null);
    setActualizandoId(usuario.id);
    try {
      await actualizarUsuarioAutorizado(usuario.id, { recibeReparto: !usuario.recibeReparto });
      refetch();
    } catch (err) {
      setFilaError({ id: usuario.id, message: extractErrorMessage(err, "No se pudo cambiar el reparto") });
    } finally {
      setActualizandoId(null);
    }
  }

  const columns: DataTableColumn<UsuarioAutorizado>[] = [
    { key: "nombreVisible", label: "Nombre", render: (u) => u.nombreVisible },
    { key: "usuarioExterno", label: "Usuario externo", render: (u) => u.usuarioExterno },
    {
      key: "rol",
      label: "Rol",
      render: (u) => (
        <select
          value={u.rol}
          disabled={actualizandoId === u.id}
          onChange={(e) => handleCambiarRol(u, e.target.value as RolUsuario)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "activo",
      label: "Estado",
      render: (u) => (
        <button
          type="button"
          className={u.activo ? "btn btn-secondary" : "btn btn-primary"}
          disabled={actualizandoId === u.id}
          onClick={() => handleToggleActivo(u)}
        >
          {u.activo ? "Activo — desactivar" : "Inactivo — activar"}
        </button>
      ),
    },
    {
      key: "recibeReparto",
      label: "Recibe reparto",
      render: (u) => (
        <label>
          <input
            type="checkbox"
            checked={u.recibeReparto}
            disabled={actualizandoId === u.id || !u.activo}
            onChange={() => handleToggleReparto(u)}
            aria-label={`${u.nombreVisible} recibe reparto de tareas`}
          />{" "}
          {u.recibeReparto ? "Sí" : "No"}
        </label>
      ),
    },
    { key: "ultimoAccesoEn", label: "Último acceso", render: (u) => formatFecha(u.ultimoAccesoEn) },
    {
      key: "creadoEn",
      label: "Creado",
      render: (u) => `${formatFecha(u.creadoEn)} · ${u.creadoPor}`,
    },
  ];

  return (
    <div className="card config-form">
      <h2>Usuarios autorizados</h2>
      <p className="muted">
        Solo los usuarios listados aquí pueden entrar a Plataforma Postventa con sus propias
        credenciales de APIWorking. Nunca se guarda ninguna contraseña en esta tabla.
      </p>
      <p className="muted">
        "Recibe reparto" decide quién recibe los contactos diarios de Tareas, repartidos en partes
        iguales entre quienes estén marcados. Aplica a cualquier rol: un ADMIN marcado también recibe
        tareas, y además puede ver las de todos.
      </p>

      {error && <p className="error-text">{error}</p>}
      {filaError && <p className="error-text">{filaError.message}</p>}

      <DataTable
        columns={columns}
        rows={data ?? []}
        rowKey={(u) => u.id}
        loading={loading}
        emptyMessage="Todavía no hay usuarios autorizados registrados."
      />

      <form className="config-actions" onSubmit={handleCrear}>
        <input
          placeholder="Usuario externo (APIWorking)"
          value={usuarioExterno}
          onChange={(e) => setUsuarioExterno(e.target.value)}
          required
        />
        <input
          placeholder="Nombre visible"
          value={nombreVisible}
          onChange={(e) => setNombreVisible(e.target.value)}
          required
        />
        <select value={rol} onChange={(e) => setRol(e.target.value as RolUsuario)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary" disabled={creando}>
          {creando ? "Agregando..." : "Agregar usuario"}
        </button>
        {formError && <span className="error-text">{formError}</span>}
      </form>
    </div>
  );
}
