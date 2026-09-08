import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import "./devoluciones.css";

type Estado = "PENDIENTE" | "APROBADA" | "RECHAZADA" | "CON_OBSERVACIONES";
type Filtro = "todas" | Estado;

interface Devolucion {
  id: string;
  fechaDevolucion: string;
  estado: Estado;
  observaciones: string | null;
  alquiler: {
    id: string;
    evento: string | null;
    usuario: { nombre: string; email: string };
    piezas: { pieza: { nombre: string; tallaEEUU: string } }[];
  };
}

export default function Devoluciones() {
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("PENDIENTE");

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data } = await api.get("/devoluciones");
    setDevoluciones(data);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const contar = (estado: Filtro) =>
    estado === "todas" ? devoluciones.length : devoluciones.filter((d) => d.estado === estado).length;

  const lista = filtro === "todas" ? devoluciones : devoluciones.filter((d) => d.estado === filtro);

  async function actualizarEstado(id: string, estado: "APROBADA" | "RECHAZADA") {
    await api.patch(`/devoluciones/${id}`, { estado });
    cargar();
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Gestión de devoluciones</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
        Revisa y aprueba o rechaza solicitudes de devolución de tus clientes.
      </p>

      <div className="tabs" role="tablist" aria-label="Filtrar devoluciones">
        {(["todas", "PENDIENTE", "APROBADA", "RECHAZADA"] as Filtro[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filtro === f}
            className={`tabs__btn ${filtro === f ? "tabs__btn--activo" : ""}`}
            onClick={() => setFiltro(f)}
          >
            {f === "todas" ? "Todas" : f.charAt(0) + f.slice(1).toLowerCase()} ({contar(f)})
          </button>
        ))}
      </div>

      {cargando ? (
        <p role="status" style={{ marginTop: "var(--space-5)" }}>Cargando…</p>
      ) : lista.length === 0 ? (
        <p style={{ color: "var(--text-muted)", marginTop: "var(--space-5)" }}>No hay devoluciones en este estado.</p>
      ) : (
        <ul className="dev-lista">
          {lista.map((d) => (
            <li key={d.id} className="card dev-card">
              <div className="dev-card__header">
                <span className="dev-card__codigo">#{d.id.slice(0, 8)}</span>
                <span className={`estado-pill estado-pill--${d.estado.toLowerCase()}`}>{d.estado.toLowerCase()}</span>
              </div>

              <div className="dev-card__meta">
                <div>
                  <span className="dev-card__label">Cliente</span>
                  <strong>{d.alquiler.usuario.nombre}</strong>
                </div>
                <div>
                  <span className="dev-card__label">Email</span>
                  <strong>{d.alquiler.usuario.email}</strong>
                </div>
                <div>
                  <span className="dev-card__label">Evento</span>
                  <strong>{d.alquiler.evento || "—"}</strong>
                </div>
                <div>
                  <span className="dev-card__label">Fecha devolución</span>
                  <strong>{new Date(d.fechaDevolucion).toLocaleDateString()}</strong>
                </div>
              </div>

              <ul className="dev-card__prendas">
                {d.alquiler.piezas.map((ap, i) => (
                  <li key={i}>{ap.pieza.nombre} · T:{ap.pieza.tallaEEUU}</li>
                ))}
              </ul>

              {d.observaciones && <p className="dev-card__comentario">"{d.observaciones}"</p>}

              {d.estado === "PENDIENTE" && (
                <div className="dev-card__acciones">
                  <button type="button" className="btn btn--primary" onClick={() => actualizarEstado(d.id, "APROBADA")}>
                    Aprobar
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => actualizarEstado(d.id, "RECHAZADA")}>
                    Rechazar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}