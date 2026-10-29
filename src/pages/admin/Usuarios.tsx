import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import "./usuarios.css";

type Rol = "CLIENTE" | "ADMINISTRADOR" | "PROVEEDOR";

interface UsuarioFila {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  creadoEn: string;
}

const ROLES: { valor: Rol; etiqueta: string }[] = [
  { valor: "CLIENTE", etiqueta: "Cliente" },
  { valor: "ADMINISTRADOR", etiqueta: "Administrador" },
  { valor: "PROVEEDOR", etiqueta: "Proveedor" },
];

const ETIQUETA: Record<Rol, string> = {
  CLIENTE: "Cliente",
  ADMINISTRADOR: "Administrador",
  PROVEEDOR: "Proveedor",
};

function mensajeDe(err: unknown): string {
  const data = (err as { response?: { data?: { mensaje?: string; errores?: Record<string, string[]> } } })?.response?.data;
  return data?.mensaje || Object.values(data?.errores ?? {})[0]?.[0] || "No se pudo completar la acción";
}

export default function Usuarios() {
  const { usuario: yo } = useAuth();

  const [usuarios, setUsuarios] = useState<UsuarioFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  // Cambios elegidos pero todavía no guardados: id de usuario -> rol elegido.
  const [pendientes, setPendientes] = useState<Record<string, Rol>>({});
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<UsuarioFila[]>("/auth/usuarios")
      .then(({ data }) => setUsuarios(data))
      .catch((err) => setError(mensajeDe(err)))
      .finally(() => setCargando(false));
  }, []);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [usuarios, busqueda]);

  const conteo = useMemo(
    () =>
      usuarios.reduce<Record<Rol, number>>(
        (acc, u) => {
          acc[u.rol] += 1;
          return acc;
        },
        { CLIENTE: 0, ADMINISTRADOR: 0, PROVEEDOR: 0 }
      ),
    [usuarios]
  );

  function elegirRol(u: UsuarioFila, rol: Rol) {
    setError(null);
    setAviso(null);
    setPendientes((prev) => {
      const siguiente = { ...prev };
      if (rol === u.rol) delete siguiente[u.id];
      else siguiente[u.id] = rol;
      return siguiente;
    });
  }

  function cancelar(id: string) {
    setPendientes((prev) => {
      const siguiente = { ...prev };
      delete siguiente[id];
      return siguiente;
    });
  }

  async function guardar(u: UsuarioFila) {
    const nuevo = pendientes[u.id];
    if (!nuevo) return;

    setGuardandoId(u.id);
    setError(null);
    setAviso(null);
    try {
      const { data } = await api.patch<UsuarioFila>(`/auth/usuarios/${u.id}/rol`, { rol: nuevo });
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, rol: data.rol } : x)));
      cancelar(u.id);
      setAviso(`${u.nombre} ahora tiene el rol ${ETIQUETA[data.rol]}.`);
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setGuardandoId(null);
    }
  }

  return (
    <div className="usuarios">
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Usuarios y roles</h1>
      <p className="usuarios__subtitulo">
        El cambio de rol se aplica de inmediato en el servidor. El rol Proveedor aún no tiene pantallas propias: quien lo
        tenga ve el menú de cliente.
      </p>

      <div className="usuarios__resumen">
        {ROLES.map((r) => (
          <div key={r.valor} className="usuarios__resumen-pill">
            {r.etiqueta} <strong>{conteo[r.valor]}</strong>
          </div>
        ))}
      </div>

      {error && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: "var(--space-3)" }}>
          {error}
        </div>
      )}
      {aviso && (
        <p className="usuarios__aviso" role="status">
          {aviso}
        </p>
      )}

      <div className="field usuarios__buscar">
        <label htmlFor="buscar-usuario" className="visually-hidden">
          Buscar usuario
        </label>
        <input
          id="buscar-usuario"
          type="text"
          placeholder="Buscar por nombre o correo…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {cargando ? (
        <p role="status">Cargando usuarios…</p>
      ) : visibles.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No se encontraron usuarios con esa búsqueda.</p>
      ) : (
        <div className="card usuarios__contenedor">
          <table className="usuarios__tabla">
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Correo</th>
                <th scope="col">Rol</th>
                <th scope="col">Registro</th>
                <th scope="col">
                  <span className="visually-hidden">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((u) => {
                const esYo = u.id === yo?.id;
                const elegido = pendientes[u.id] ?? u.rol;
                const hayCambio = elegido !== u.rol;
                const guardando = guardandoId === u.id;

                return (
                  <tr key={u.id} className={hayCambio ? "usuarios__fila--cambio" : undefined}>
                    <td>
                      <strong>{u.nombre}</strong>
                      {esYo && <span className="usuarios__tu"> (tú)</span>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        aria-label={`Rol de ${u.nombre}`}
                        value={elegido}
                        disabled={esYo || guardando}
                        title={esYo ? "No puedes cambiar tu propio rol" : undefined}
                        onChange={(e) => elegirRol(u, e.target.value as Rol)}
                      >
                        {ROLES.map((r) => (
                          <option key={r.valor} value={r.valor}>
                            {r.etiqueta}
                          </option>
                        ))}
                      </select>
                      {hayCambio && elegido === "ADMINISTRADOR" && (
                        <span className="usuarios__advertencia">Dará acceso total al panel de administración.</span>
                      )}
                    </td>
                    <td>{new Date(u.creadoEn).toLocaleDateString("es-PE")}</td>
                    <td className="usuarios__acciones">
                    {hayCambio && (
                        <div className="usuarios__acciones-botones">
                        <button
                            type="button"
                            className="btn btn--primary"
                            disabled={guardando}
                            onClick={() => guardar(u)}
                        >
                            {guardando ? "Guardando…" : "Guardar"}
                        </button>

                        <button
                            type="button"
                            className="btn btn--ghost"
                            disabled={guardando}
                            onClick={() => cancelar(u.id)}
                        >
                            Cancelar
                        </button>
                        </div>
                    )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}