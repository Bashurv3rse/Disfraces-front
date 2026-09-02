import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { useCarrito } from "../../lib/CarritoContext";
import { iconoPorTipo, colorPorSemilla } from "../../lib/iconos";
import "./catalogo.css";

interface Pieza {
  id: string;
  nombre: string;
  tipo: string;
  tallaEEUU: string;
  color: string;
  temporadaOriginal: string;
  stock: number;
  precioAlquiler: string;
}

const TIPOS = ["SOMBRERO", "CAMISA_POLO", "PANTALON", "ZAPATO_ZAPATILLA", "ABRIGO", "CHALECO", "TRAJE", "TACON", "ACCESORIO"];

export default function Catalogo() {
  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroTemporada, setFiltroTemporada] = useState("");
  const { usuario } = useAuth();
  const { agregarItem } = useCarrito();

  const cargarPiezas = useCallback(async () => {
    setCargando(true);
    const params: Record<string, string> = {};
    if (filtroTipo) params.tipo = filtroTipo;
    if (filtroTemporada) params.temporadaOriginal = filtroTemporada;

    const { data } = await api.get("/catalogo", { params });
    setPiezas(data);
    setCargando(false);
  }, [filtroTipo, filtroTemporada]);

  useEffect(() => {
    const timeout = setTimeout(cargarPiezas, 300);
    return () => clearTimeout(timeout);
  }, [cargarPiezas]);

  function handleAgregar(p: Pieza) {
    agregarItem({
      nombreConjunto: p.nombre,
      piezas: [
        {
          id: p.id,
          nombre: p.nombre,
          tipo: p.tipo,
          tallaEEUU: p.tallaEEUU,
          color: p.color,
          precioAlquiler: Number(p.precioAlquiler),
        },
      ],
    });
  }

  return (
    <div className="catalogo">
      <aside className="catalogo__filtros" aria-label="Filtros de catálogo">
        <h2 style={{ fontSize: "1.1rem", marginBottom: "var(--space-4)" }}>Filtrar</h2>

        <div className="field">
          <label htmlFor="filtro-tipo">Tipo de pieza</label>
          <select id="filtro-tipo" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>{t.replace("_", " / ")}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="filtro-temporada">Temporada</label>
          <input
            id="filtro-temporada"
            type="text"
            placeholder="ej. halloween"
            value={filtroTemporada}
            onChange={(e) => setFiltroTemporada(e.target.value)}
          />
        </div>
      </aside>

      <section aria-label="Resultados del catálogo" className="catalogo__resultados">
        {cargando ? (
          <p role="status">Cargando piezas…</p>
        ) : piezas.length === 0 ? (
          <p>No se encontraron piezas con estos filtros.</p>
        ) : (
          <ul className="catalogo__grid">
            {piezas.map((p) => (
              <li key={p.id} className="card catalogo__item">
                <div
                  className="catalogo__imagen"
                  style={{ background: colorPorSemilla(p.tipo) }}
                  aria-hidden="true"
                >
                  <span className="catalogo__icono">{iconoPorTipo(p.tipo)}</span>
                </div>
                <h3 style={{ fontSize: "1rem" }}>{p.nombre}</h3>
                <p className="catalogo__meta">{p.tipo.replace("_", " / ")} · Talla {p.tallaEEUU} · {p.color}</p>
                <p className="catalogo__meta">Temporada: {p.temporadaOriginal}</p>
                <p className="catalogo__precio">S/ {p.precioAlquiler} / día</p>
                <p className="catalogo__stock">{p.stock > 0 ? `${p.stock} disponibles` : "Sin stock"}</p>

                {usuario ? (
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={p.stock === 0}
                    onClick={() => handleAgregar(p)}
                  >
                    Agregar al carrito
                  </button>
                ) : (
                  <Link to="/login" className="btn btn--ghost">Inicia sesión para alquilar</Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}