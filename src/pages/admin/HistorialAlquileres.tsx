import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import "./historial-alquileres.css";

interface Fila {
  id: string;
  cliente: { nombre: string; email: string };
  disfraces: { id: string; nombre: string; tallaRopa: string | null; tallaCalzado: string | null }[];
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  montoTotal: number;
  estadoVisible: string;
}

interface Respuesta {
  alquileres: Fila[];
  conteo: Record<string, number>;
  totalIngresos: number;
}

const ESTADOS: Record<string, string> = {
  PENDIENTE: "Pendiente de pago",
  PROXIMO: "Próximo",
  EN_CURSO: "En curso",
  POR_DEVOLVER: "Por devolver",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

const dia = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { timeZone: "UTC" });

export default function HistorialAlquileres() {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    const espera = setTimeout(() => {
      const params: Record<string, string> = {};
      if (estado) params.estado = estado;
      if (busqueda.trim()) params.busqueda = busqueda.trim();
      api
        .get<Respuesta>("/alquileres/admin/historial", { params })
        .then(({ data }) => {
          if (!vigente) return;
          setDatos(data);
          setError(null);
        })
        .catch(() => vigente && setError("No se pudo cargar el historial de alquileres."));
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [estado, busqueda]);

  return (
    <div className="hist-alq">
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Historial de alquileres</h1>
      <p className="hist-alq__subtitulo">
        Quién alquiló cada disfraz, con qué tallas, por cuánto tiempo y a qué precio. El estado combina el pago con las fechas.
      </p>

      {datos && (
        <div className="hist-alq__resumen">
          <div className="hist-alq__pill">Alquileres <strong>{datos.alquileres.length}</strong></div>
          <div className="hist-alq__pill">Total <strong>S/ {datos.totalIngresos.toFixed(2)}</strong></div>
          {Object.entries(datos.conteo).map(([k, n]) => (
            <div key={k} className="hist-alq__pill">{ESTADOS[k] ?? k} <strong>{n}</strong></div>
          ))}
        </div>
      )}

      <div className="hist-alq__filtros">
        <div className="field">
          <label htmlFor="hist-busqueda">Cliente o disfraz</label>
          <input id="hist-busqueda" type="text" placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="hist-estado">Estado</label>
          <select id="hist-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ESTADOS).map(([v, t]) => (
              <option key={v} value={v}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p role="alert">{error}</p>}
      {!error && !datos && <p role="status">Cargando historial…</p>}

      {datos &&
        (datos.alquileres.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No hay alquileres con estos filtros.</p>
        ) : (
          <div className="card hist-alq__contenedor">
            <table className="hist-alq__tabla">
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Disfraces y tallas</th>
                  <th scope="col">Periodo</th>
                  <th scope="col" className="num">Días</th>
                  <th scope="col" className="num">Precio</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {datos.alquileres.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <strong>{f.cliente.nombre}</strong>
                      <br />
                      <small>{f.cliente.email}</small>
                    </td>
                    <td>
                      {f.disfraces.map((d) => (
                        <div key={d.id} className="hist-alq__disfraz">
                          {d.nombre}
                          <div className="hist-alq__tallas">
                            {d.tallaRopa && <span className="hist-alq__talla">Ropa {d.tallaRopa}</span>}
                            {d.tallaCalzado && <span className="hist-alq__talla">Calzado {d.tallaCalzado}</span>}
                          </div>
                        </div>
                      ))}
                    </td>
                    <td>{dia(f.fechaInicio)} – {dia(f.fechaFin)}</td>
                    <td className="num">{f.dias}</td>
                    <td className="num">S/ {f.montoTotal.toFixed(2)}</td>
                    <td>
                      <span className={`hist-alq__estado hist-alq__estado--${f.estadoVisible.toLowerCase()}`}>
                        {ESTADOS[f.estadoVisible] ?? f.estadoVisible}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
