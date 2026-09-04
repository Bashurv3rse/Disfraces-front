import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import "./mis-alquileres.css";

interface PiezaAlquiler {
  precioUnitario: string;
  pieza: { id: string; nombre: string; tallaEEUU: string };
}

interface Alquiler {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  evento: string | null;
  estado: "PENDIENTE" | "ACTIVO" | "FINALIZADO" | "CANCELADO";
  montoTotal: string;
  piezas: PiezaAlquiler[];
}

export default function MisAlquileres() {
  const [alquileres, setAlquileres] = useState<Alquiler[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<"ACTIVO" | "FINALIZADO">("ACTIVO");

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data } = await api.get("/alquileres/mios");
    setAlquileres(data);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function handleDevolver(id: string, nombre: string) {
    if (!confirm(`¿Confirmas la devolución de "${nombre}"? Esto simula el proceso.`)) return;
    await api.delete(`/alquileres/${id}`);
    cargar();
  }

  const activos = alquileres.filter((a) => a.estado === "ACTIVO" || a.estado === "PENDIENTE");
  const historial = alquileres.filter((a) => a.estado === "FINALIZADO" || a.estado === "CANCELADO");
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

      {cargando ? (
        <p role="status" style={{ marginTop: "var(--space-5)" }}>Cargando…</p>
      ) : lista.length === 0 ? (
        <p style={{ color: "var(--text-muted)", marginTop: "var(--space-5)" }}>
          No tienes alquileres {pestana === "ACTIVO" ? "activos" : "en tu historial"} todavía.
        </p>
      ) : (
        <ul className="alquileres-lista">
          {lista.map((a) => (
            <li key={a.id} className="card alquiler-card">
              <div className="alquiler-card__header">
                <h2 style={{ fontSize: "1.05rem" }}>{a.evento || "Alquiler"}</h2>
                <span className={`estado-badge ${a.estado === "ACTIVO" ? "estado-badge--activo" : ""}`}>
                  {a.estado === "ACTIVO" ? "Activo" : a.estado === "PENDIENTE" ? "Pendiente" : "Finalizado"}
                </span>
              </div>

              <div className="alquiler-card__fechas">
                <div>
                  <span className="alquiler-card__label">Inicio</span>
                  <strong>{new Date(a.fechaInicio).toLocaleDateString()}</strong>
                </div>
                <div>
                  <span className="alquiler-card__label">Fin</span>
                  <strong>{new Date(a.fechaFin).toLocaleDateString()}</strong>
                </div>
              </div>

              <ul className="alquiler-card__piezas">
                {a.piezas.map((ap) => (
                  <li key={ap.pieza.id}>
                    <span>{ap.pieza.nombre} <span className="alquiler-card__talla">T:{ap.pieza.tallaEEUU}</span></span>
                    <span className="alquiler-card__precio-unit">S/{ap.precioUnitario}/d</span>
                  </li>
                ))}
              </ul>

              <div className="alquiler-card__footer">
                <span className="alquiler-card__total">S/ {Number(a.montoTotal).toFixed(2)}/día</span>
                {pestana === "ACTIVO" && (
                  <button type="button" className="btn btn--ghost" onClick={() => handleDevolver(a.id, a.evento || "este alquiler")}>
                    Devolver
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}