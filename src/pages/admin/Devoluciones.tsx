import { useState } from "react";
import { DEVOLUCIONES } from "../../lib/mockAdmin";
import type { Devolucion } from "../../lib/mockAdmin";
import "./devoluciones.css";

type Filtro = "todas" | Devolucion["estado"];

export default function Devoluciones() {
  const [devoluciones, setDevoluciones] = useState(DEVOLUCIONES);
  const [filtro, setFiltro] = useState<Filtro>("pendiente");

  const contar = (estado: Filtro) =>
    estado === "todas" ? devoluciones.length : devoluciones.filter((d) => d.estado === estado).length;

  const lista = filtro === "todas" ? devoluciones : devoluciones.filter((d) => d.estado === filtro);

  function actualizarEstado(id: string, estado: Devolucion["estado"]) {
    setDevoluciones((prev) => prev.map((d) => (d.id === id ? { ...d, estado } : d)));
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Gestión de devoluciones</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
        Revisa y aprueba o rechaza solicitudes de devolución.
      </p>

      <div className="tabs" role="tablist" aria-label="Filtrar devoluciones">
        {(["todas", "pendiente", "aprobada", "rechazada"] as Filtro[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filtro === f}
            className={`tabs__btn ${filtro === f ? "tabs__btn--activo" : ""}`}
            onClick={() => setFiltro(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({contar(f)})
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <p style={{ color: "var(--text-muted)", marginTop: "var(--space-5)" }}>No hay devoluciones en este estado.</p>
      ) : (
        <ul className="dev-lista">
          {lista.map((d) => (
            <li key={d.id} className="card dev-card">
              <div className="dev-card__header">
                <span className="dev-card__codigo">{d.codigo}</span>
                <span className={`estado-pill estado-pill--${d.estado}`}>{d.estado}</span>
              </div>

              <div className="dev-card__meta">
                <div>
                  <span className="dev-card__label">Cliente</span>
                  <strong>{d.cliente}</strong>
                </div>
                <div>
                  <span className="dev-card__label">Alquiler</span>
                  <strong>{d.alquilerRef}</strong>
                </div>
                <div>
                  <span className="dev-card__label">Fecha devolución</span>
                  <strong>{d.fechaDevolucion}</strong>
                </div>
                <div>
                  <span className="dev-card__label">Estado prendas</span>
                  <strong>{d.estadoPrendas}</strong>
                </div>
              </div>

              <ul className="dev-card__prendas">
                {d.prendas.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>

              <p className="dev-card__comentario">"{d.comentario}"</p>

              {d.estado === "pendiente" && (
                <div className="dev-card__acciones">
                  <button type="button" className="btn btn--primary" onClick={() => actualizarEstado(d.id, "aprobada")}>
                    Aprobar
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => actualizarEstado(d.id, "rechazada")}>
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