import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import "./devoluciones.css";

interface PrendaDevuelta {
  estadoPrenda: "BUEN_ESTADO" | "DANADA" | "FALTANTE";
  prenda: { id: string; nombre: string; tipo: string; color: string; talla: string };
}

interface Devolucion {
  id: string;
  fechaDevolucion: string;
  observaciones: string | null;
  prendas: PrendaDevuelta[];
  alquiler: {
    id: string;
    evento: string | null;
    montoGarantia: string;
    usuario: { nombre: string; email: string };
  };
}

const ETIQUETA_ESTADO_PRENDA: Record<string, string> = {
  BUEN_ESTADO: "Buen estado",
  DANADA: "Dañada",
  FALTANTE: "Faltante",
};

export default function Devoluciones() {
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data } = await api.get("/devoluciones");
    setDevoluciones(data);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Devoluciones</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
        Registro de devoluciones de tus clientes y si corresponde devolver la garantía.
      </p>

      {cargando ? (
        <p role="status">Cargando…</p>
      ) : devoluciones.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Aún no hay devoluciones registradas.</p>
      ) : (
        <ul className="dev-lista">
          {devoluciones.map((d) => {
            const garantia = Number(d.alquiler.montoGarantia);
            const buenEstado = d.prendas.every((p) => p.estadoPrenda === "BUEN_ESTADO");

            return (
              <li key={d.id} className="card dev-card">
                <div className="dev-card__header">
                  <span className="dev-card__codigo">#{d.id.slice(0, 8)}</span>
                  <span className={`estado-pill ${buenEstado ? "estado-pill--aprobada" : "estado-pill--rechazada"}`}>
                    {buenEstado ? "Garantía devuelta" : "Garantía no devuelta"}
                  </span>
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
                  {d.prendas.map((dp) => (
                    <li key={dp.prenda.id}>
                      {dp.prenda.nombre} · {dp.prenda.color} · {dp.prenda.talla}
                      <span className={`dev-card__estado-prenda dev-card__estado-prenda--${dp.estadoPrenda.toLowerCase()}`}>
                        {ETIQUETA_ESTADO_PRENDA[dp.estadoPrenda]}
                      </span>
                    </li>
                  ))}
                </ul>

                {d.observaciones && <p className="dev-card__comentario">"{d.observaciones}"</p>}

                <p className={`dev-card__garantia ${buenEstado ? "dev-card__garantia--ok" : "dev-card__garantia--no"}`}>
                  {buenEstado ? `Se devuelve la garantía: S/ ${garantia.toFixed(2)}` : "No se devuelve la garantía (25%)"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}