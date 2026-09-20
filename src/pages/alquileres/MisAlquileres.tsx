import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import { ReportarDevolucion } from "../../components/ReportarDevolucion";
import "./mis-alquileres.css";

interface Prenda {
  id: string;
  nombre: string;
  tipo: string;
  color: string;
  talla: string;
}

interface AlquilerDisfraz {
  precioUnitario: string;
  disfrazFisico: {
    id: string;
    nombre: string;
    tipoDisfraz: string;
    prendasActuales: Prenda[];
  };
}

interface Alquiler {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  evento: string | null;
  estado: "PENDIENTE" | "ACTIVO" | "FINALIZADO" | "CANCELADO";
  montoTotal: string;
  montoGarantia: string;
  disfraces: AlquilerDisfraz[];
}

export default function MisAlquileres() {
  const [alquileres, setAlquileres] = useState<Alquiler[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<"ACTIVO" | "FINALIZADO">("ACTIVO");
  const [devolviendo, setDevolviendo] = useState<Alquiler | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data } = await api.get("/alquileres/mios");
    setAlquileres(data);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

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
                {a.disfraces.map((ad) => (
                  <li key={ad.disfrazFisico.id}>
                    <span>{ad.disfrazFisico.nombre} <span className="alquiler-card__talla">{ad.disfrazFisico.tipoDisfraz}</span></span>
                    <span className="alquiler-card__precio-unit">S/{ad.precioUnitario}/d</span>
                  </li>
                ))}
              </ul>

              <p className="alquiler-card__garantia">
                Garantía (25%): S/ {Number(a.montoGarantia).toFixed(2)} — se devuelve si el disfraz vuelve en buen estado
              </p>

              <div className="alquiler-card__footer">
                <span className="alquiler-card__total">S/ {Number(a.montoTotal).toFixed(2)}/día</span>
                {pestana === "ACTIVO" && (
                  <button type="button" className="btn btn--primary" onClick={() => setDevolviendo(a)}>
                    Devolver
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {devolviendo && (
        <ReportarDevolucion
          alquilerId={devolviendo.id}
          disfraces={devolviendo.disfraces}
          onCerrar={() => setDevolviendo(null)}
          onConfirmado={() => {
            setDevolviendo(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}