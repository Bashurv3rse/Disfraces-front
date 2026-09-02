import { useState } from "react";
import { useAlquileres } from "../../lib/AlquileresContext";
import "./mis-alquileres.css";

export default function MisAlquileres() {
  const { alquileres } = useAlquileres();
  const [pestana, setPestana] = useState<"ACTIVO" | "FINALIZADO">("ACTIVO");

  const activos = alquileres.filter((a) => a.estado === "ACTIVO");
  const historial = alquileres.filter((a) => a.estado === "FINALIZADO");
  const lista = pestana === "ACTIVO" ? activos : historial;

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-5)" }}>Mis alquileres</h1>

      <div className="tabs" role="tablist" aria-label="Filtrar alquileres">
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "ACTIVO"}
          className={`tabs__btn ${pestana === "ACTIVO" ? "tabs__btn--activo" : ""}`}
          onClick={() => setPestana("ACTIVO")}
        >
          Activos ({activos.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "FINALIZADO"}
          className={`tabs__btn ${pestana === "FINALIZADO" ? "tabs__btn--activo" : ""}`}
          onClick={() => setPestana("FINALIZADO")}
        >
          Historial ({historial.length})
        </button>
      </div>

      {lista.length === 0 ? (
        <p style={{ color: "var(--text-muted)", marginTop: "var(--space-5)" }}>
          No tienes alquileres {pestana === "ACTIVO" ? "activos" : "en tu historial"} todavía.
        </p>
      ) : (
        <ul className="alquileres-lista">
          {lista.map((a) => (
            <li key={a.id} className="card alquiler-card">
              <div className="alquiler-card__header">
                <h2 style={{ fontSize: "1.05rem" }}>{a.evento || a.nombreConjunto}</h2>
                <span className={`estado-badge ${a.estado === "ACTIVO" ? "estado-badge--activo" : ""}`}>
                  {a.estado === "ACTIVO" ? "Activo" : "Finalizado"}
                </span>
              </div>

              <div className="alquiler-card__fechas">
                <div>
                  <span className="alquiler-card__label">Inicio</span>
                  <strong>{a.fechaInicio || "—"}</strong>
                </div>
                <div>
                  <span className="alquiler-card__label">Fin</span>
                  <strong>{a.fechaFin || "—"}</strong>
                </div>
              </div>

              <ul className="alquiler-card__piezas">
                {a.piezas.map((p) => (
                  <li key={p.id}>
                    {p.nombre} <span className="alquiler-card__talla">T:{p.tallaEEUU}</span>
                  </li>
                ))}
              </ul>

              <div className="alquiler-card__footer">
                <span className="alquiler-card__total">S/ {a.montoTotal.toFixed(2)}/día</span>
                {pestana === "ACTIVO" && (
                  <button type="button" className="btn btn--ghost">Devolver</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}