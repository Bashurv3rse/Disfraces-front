import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { useCarrito } from "../../lib/CarritoContext";
import { iconoPorTemporada, colorPorSemilla } from "../../lib/iconos";
import "./conjuntos.css";

interface PiezaResumen {
  pieza: {
    id: string;
    nombre: string;
    tipo: string;
    tallaEEUU: string;
    color: string;
    precioAlquiler: string;
  };
}

interface Conjunto {
  id: string;
  nombre: string;
  tipo: "PREDETERMINADO" | "PERSONALIZADO";
  temporadaEvento: string;
  piezas: PiezaResumen[];
}

export default function Conjuntos() {
  const [conjuntos, setConjuntos] = useState<Conjunto[]>([]);
  const [temporada, setTemporada] = useState("");
  const [cargando, setCargando] = useState(true);
  const { usuario } = useAuth();
  const { agregarItem } = useCarrito();

  const cargar = useCallback(async () => {
    setCargando(true);
    const params: Record<string, string> = { tipo: "PREDETERMINADO" };
    if (temporada) params.temporadaEvento = temporada;
    const { data } = await api.get("/conjuntos", { params });
    setConjuntos(data);
    setCargando(false);
  }, [temporada]);

  useEffect(() => {
    const timeout = setTimeout(cargar, 300);
    return () => clearTimeout(timeout);
  }, [cargar]);

  function handleAgregar(c: Conjunto) {
    agregarItem({
      nombreConjunto: c.nombre,
      piezas: c.piezas.map((cp) => ({
        id: cp.pieza.id,
        nombre: cp.pieza.nombre,
        tipo: cp.pieza.tipo,
        tallaEEUU: cp.pieza.tallaEEUU,
        color: cp.pieza.color,
        precioAlquiler: Number(cp.pieza.precioAlquiler),
      })),
    });
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-5)" }}>Conjuntos por temporada</h1>

      <div className="field" style={{ maxWidth: 280, marginBottom: "var(--space-5)" }}>
        <label htmlFor="filtro-temporada-conjunto">Temporada / evento</label>
        <input
          id="filtro-temporada-conjunto"
          type="text"
          placeholder="ej. halloween"
          value={temporada}
          onChange={(e) => setTemporada(e.target.value)}
        />
      </div>

      {cargando ? (
        <p role="status">Cargando conjuntos…</p>
      ) : conjuntos.length === 0 ? (
        <p>No hay conjuntos predeterminados para esta temporada.</p>
      ) : (
        <ul className="conjuntos__grid">
          {conjuntos.map((c) => (
            <li key={c.id} className="card conjuntos__item">
              <div
                className="conjuntos__imagen"
                style={{ background: colorPorSemilla(c.temporadaEvento) }}
                aria-hidden="true"
              >
                <span className="conjuntos__icono">{iconoPorTemporada(c.temporadaEvento)}</span>
              </div>
              <h2 style={{ fontSize: "1.05rem" }}>{c.nombre}</h2>
              <p className="conjuntos__temporada">{c.temporadaEvento}</p>
              <ul className="conjuntos__piezas">
                {c.piezas.map((cp) => (
                  <li key={cp.pieza.id}>
                    {cp.pieza.nombre} · {cp.pieza.tallaEEUU} · {cp.pieza.color}
                  </li>
                ))}
              </ul>

              {usuario ? (
                <button type="button" className="btn btn--primary" onClick={() => handleAgregar(c)}>
                  Agregar al carrito
                </button>
              ) : (
                <Link to="/login" className="btn btn--ghost">Inicia sesión para alquilar</Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}