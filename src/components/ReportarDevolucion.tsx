import { useState } from "react";
import { api } from "../lib/api";
import "./reportar-devolucion.css";

interface Prenda {
  id: string;
  nombre: string;
  tipo: string;
  color: string;
  talla: string;
}

interface DisfrazEnAlquiler {
  disfrazFisico: {
    id: string;
    nombre: string;
    prendasActuales: Prenda[];
  };
}

interface Props {
  alquilerId: string;
  disfraces: DisfrazEnAlquiler[];
  onCerrar: () => void;
  onConfirmado: () => void;
}

type EstadoPrenda = "BUEN_ESTADO" | "DANADA" | "FALTANTE";

const OPCIONES: { valor: EstadoPrenda; label: string }[] = [
  { valor: "BUEN_ESTADO", label: "Buen estado" },
  { valor: "DANADA", label: "Dañada" },
  { valor: "FALTANTE", label: "Faltante" },
];

export function ReportarDevolucion({ alquilerId, disfraces, onCerrar, onConfirmado }: Props) {
  const [estados, setEstados] = useState<Record<string, EstadoPrenda>>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sustituciones, setSustituciones] = useState<{ prenda: string; disfrazNecesitado: string }[] | null>(null);

  const todasLasPrendas = disfraces.flatMap((d) => d.disfrazFisico.prendasActuales);
  const faltantes = todasLasPrendas.filter((p) => !estados[p.id]);

  async function handleConfirmar() {
    if (faltantes.length > 0) return;
    setEnviando(true);
    setError(null);
    try {
      const { data } = await api.post("/devoluciones", {
        alquilerId,
        fechaDevolucion: new Date().toISOString(),
        prendas: todasLasPrendas.map((p) => ({ prendaId: p.id, estadoPrenda: estados[p.id] })),
      });
      if (data.sustituciones?.length) {
        setSustituciones(data.sustituciones);
      } else {
        onConfirmado();
      }
    } catch (err: any) {
      setError(err.response?.data?.mensaje || "No se pudo registrar la devolución");
    } finally {
      setEnviando(false);
    }
  }

  if (sustituciones) {
    return (
      <div className="reportar-overlay" onClick={onCerrar}>
        <div className="reportar-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <h2>Devolución registrada</h2>
          <p className="reportar-modal__desc">
            El sistema reasignó automáticamente {sustituciones.length} prenda(s) para completar otros disfraces:
          </p>
          <ul className="reportar-sustituciones">
            {sustituciones.map((s, i) => (
              <li key={i}>
                <strong>{s.prenda}</strong> ahora completa <strong>{s.disfrazNecesitado}</strong>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn--primary" onClick={onConfirmado}>
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reportar-overlay" onClick={onCerrar}>
      <div
        className="reportar-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Reportar estado de devolución"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reportar-modal__header">
          <h2>¿En qué estado devuelves cada prenda?</h2>
          <button type="button" className="reportar-modal__cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
        </div>

        {error && <div className="alert alert--danger" role="alert">{error}</div>}

        <div className="reportar-modal__lista">
          {disfraces.map((d) => (
            <div key={d.disfrazFisico.id} className="reportar-disfraz">
              <h3>{d.disfrazFisico.nombre}</h3>
              {d.disfrazFisico.prendasActuales.map((p) => (
                <div key={p.id} className="reportar-prenda">
                  <span className="reportar-prenda__nombre">{p.nombre} <em>· {p.color} · {p.talla}</em></span>
                  <div className="reportar-prenda__opciones">
                    {OPCIONES.map((o) => (
                      <button
                        key={o.valor}
                        type="button"
                        className={`chip ${estados[p.id] === o.valor ? "chip--activo" : ""}`}
                        onClick={() => setEstados((prev) => ({ ...prev, [p.id]: o.valor }))}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <button type="button" className="btn btn--primary" disabled={faltantes.length > 0 || enviando} onClick={handleConfirmar}>
          {enviando ? "Enviando…" : faltantes.length > 0 ? "Reporta el estado de todas las prendas" : "Confirmar devolución"}
        </button>
      </div>
    </div>
  );
}