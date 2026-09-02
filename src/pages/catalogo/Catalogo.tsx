import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
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

  const cargarPiezas = useCallback(async () => {
    setCargando(true);
    const params: Record<string, string> = {};
    if (filtroTipo) params.tipo = filtroTipo;
    if (filtroTemporada) params.temporadaOriginal = filtroTemporada;

    const { data } = await api.get("/catalogo", { params });
    setPiezas(data);
    setCargando(false);
  }, [filtroTipo, filtroTemporada]);

  // WPO: debounce simple para no golpear la API en cada tecla del filtro de texto
  useEffect(() => {
    const timeout = setTimeout(cargarPiezas, 300);
    return () => clearTimeout(timeout);
  }, [cargarPiezas]);

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
                <h3 style={{ fontSize: "1rem" }}>{p.nombre}</h3>
                <p className="catalogo__meta">{p.tipo.replace("_", " / ")} · Talla {p.tallaEEUU} · {p.color}</p>
                <p className="catalogo__meta">Temporada: {p.temporadaOriginal}</p>
                <p className="catalogo__precio">S/ {p.precioAlquiler} / alquiler</p>
                <p className="catalogo__stock">{p.stock > 0 ? `${p.stock} disponibles` : "Sin stock"}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
