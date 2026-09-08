import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { useCarrito } from "../../lib/CarritoContext";
import { iconoPorTipo, colorPorSemilla } from "../../lib/iconos";
import { tallasPorDefecto, coloresPorDefecto } from "../../lib/opciones";
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
  tallasDisponibles: string[];
  coloresDisponibles: string[];
}

const TIPOS = ["SOMBRERO", "CAMISA_POLO", "PANTALON", "ZAPATO_ZAPATILLA", "ABRIGO", "CHALECO", "TRAJE", "TACON", "ACCESORIO"];

const PALETA_COLORES: { nombre: string; hex: string }[] = [
  { nombre: "negro", hex: "#2B2118" },
  { nombre: "blanco", hex: "#F5F1E8" },
  { nombre: "gris", hex: "#9B9488" },
  { nombre: "rojo", hex: "#C0392B" },
  { nombre: "azul", hex: "#2C6FA8" },
  { nombre: "verde", hex: "#3C8C5D" },
  { nombre: "marrón", hex: "#7A5230" },
  { nombre: "dorado", hex: "#C9A227" },
  { nombre: "plateado", hex: "#B8BEC4" },
  { nombre: "multicolor", hex: "conic-gradient(#C0392B,#C9A227,#3C8C5D,#2C6FA8,#7A5230)" },
];

export default function Catalogo() {
  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [tiposFiltro, setTiposFiltro] = useState<Set<string>>(new Set());
  const [temporadasFiltro, setTemporadasFiltro] = useState<Set<string>>(new Set());
  const [coloresFiltro, setColoresFiltro] = useState<Set<string>>(new Set());
  const [temporadasDisponibles, setTemporadasDisponibles] = useState<string[]>([]);
  const [tallaElegida, setTallaElegida] = useState<Record<string, string>>({});
  const [colorElegido, setColorElegido] = useState<Record<string, string>>({});
  const { usuario } = useAuth();
  const { agregarItem } = useCarrito();

  useEffect(() => {
    api.get("/catalogo/temporadas").then(({ data }) => setTemporadasDisponibles(data));
  }, []);

  const cargarPiezas = useCallback(async () => {
    setCargando(true);
    const params: Record<string, string> = {};
    if (busqueda) params.nombre = busqueda;
    if (tiposFiltro.size) params.tipos = Array.from(tiposFiltro).join(",");
    if (temporadasFiltro.size) params.temporadas = Array.from(temporadasFiltro).join(",");
    if (coloresFiltro.size) params.colores = Array.from(coloresFiltro).join(",");

    const { data } = await api.get("/catalogo", { params });
    setPiezas(data);
    setCargando(false);
  }, [busqueda, tiposFiltro, temporadasFiltro, coloresFiltro]);

  useEffect(() => {
    const timeout = setTimeout(cargarPiezas, 300);
    return () => clearTimeout(timeout);
  }, [cargarPiezas]);

  function toggleEnSet(set: Set<string>, valor: string, setter: (s: Set<string>) => void) {
    const copia = new Set(set);
    copia.has(valor) ? copia.delete(valor) : copia.add(valor);
    setter(copia);
  }

  function limpiarFiltros() {
    setBusqueda("");
    setTiposFiltro(new Set());
    setTemporadasFiltro(new Set());
    setColoresFiltro(new Set());
  }

  const hayFiltrosActivos =
    busqueda !== "" || tiposFiltro.size > 0 || temporadasFiltro.size > 0 || coloresFiltro.size > 0;

  function opcionesTalla(p: Pieza) {
    return p.tallasDisponibles?.length ? p.tallasDisponibles : tallasPorDefecto(p.tipo);
  }
  function opcionesColor(p: Pieza) {
    return p.coloresDisponibles?.length ? p.coloresDisponibles : coloresPorDefecto();
  }

  function handleAgregar(p: Pieza) {
    const talla = tallaElegida[p.id] || opcionesTalla(p)[0];
    const color = colorElegido[p.id] || opcionesColor(p)[0];
    agregarItem({
      nombreConjunto: p.nombre,
      piezas: [
        {
          id: p.id,
          nombre: p.nombre,
          tipo: p.tipo,
          tallaEEUU: talla,
          color,
          precioAlquiler: Number(p.precioAlquiler),
        },
      ],
    });
  }

  return (
    <div className="catalogo">
      <aside className="catalogo__filtros" aria-label="Filtros de catálogo">
        <div className="catalogo__filtros-header">
          <h2 style={{ fontSize: "1.1rem" }}>Filtros</h2>
          {hayFiltrosActivos && (
            <button type="button" className="catalogo__limpiar" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="field">
          <label htmlFor="buscar-pieza" className="visually-hidden">Buscar</label>
          <input
            id="buscar-pieza"
            type="text"
            placeholder="Buscar…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <fieldset className="catalogo__grupo">
          <legend>Categoría</legend>
          {TIPOS.map((t) => (
            <label key={t} className="catalogo__checkbox">
              <input
                type="checkbox"
                checked={tiposFiltro.has(t)}
                onChange={() => toggleEnSet(tiposFiltro, t, setTiposFiltro)}
              />
              {t.replace("_", " / ")}
            </label>
          ))}
        </fieldset>

        <fieldset className="catalogo__grupo">
          <legend>Temporada</legend>
          {temporadasDisponibles.map((t) => (
            <label key={t} className="catalogo__checkbox">
              <input
                type="checkbox"
                checked={temporadasFiltro.has(t)}
                onChange={() => toggleEnSet(temporadasFiltro, t, setTemporadasFiltro)}
              />
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </label>
          ))}
        </fieldset>

        <fieldset className="catalogo__grupo">
          <legend>Color</legend>
          <div className="catalogo__swatches">
            {PALETA_COLORES.map((c) => (
              <button
                key={c.nombre}
                type="button"
                className={`catalogo__swatch ${coloresFiltro.has(c.nombre) ? "catalogo__swatch--activo" : ""}`}
                style={{ background: c.hex }}
                aria-pressed={coloresFiltro.has(c.nombre)}
                aria-label={`Filtrar por color ${c.nombre}`}
                title={c.nombre}
                onClick={() => toggleEnSet(coloresFiltro, c.nombre, setColoresFiltro)}
              />
            ))}
          </div>
        </fieldset>
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
                <p className="catalogo__meta">{p.tipo.replace("_", " / ")} · Temporada: {p.temporadaOriginal}</p>
                <p className="catalogo__precio">S/ {p.precioAlquiler} / día</p>
                <p className="catalogo__stock">{p.stock > 0 ? `${p.stock} disponibles` : "Sin stock"}</p>

                {usuario ? (
                  <>
                    <div className="catalogo__variantes">
                      <div className="field">
                        <label htmlFor={`talla-${p.id}`}>Talla</label>
                        <select
                          id={`talla-${p.id}`}
                          value={tallaElegida[p.id] || opcionesTalla(p)[0]}
                          onChange={(e) => setTallaElegida((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        >
                          {opcionesTalla(p).map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor={`color-${p.id}`}>Color</label>
                        <select
                          id={`color-${p.id}`}
                          value={colorElegido[p.id] || opcionesColor(p)[0]}
                          onChange={(e) => setColorElegido((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        >
                          {opcionesColor(p).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={p.stock === 0}
                      onClick={() => handleAgregar(p)}
                    >
                      Agregar al carrito
                    </button>
                  </>
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