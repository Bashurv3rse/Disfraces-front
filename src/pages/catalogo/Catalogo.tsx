import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { useCarrito } from "../../lib/CarritoContext";
import { iconoPorTemporada, colorPorSemilla } from "../../lib/iconos";
import "./catalogo.css";

interface Prenda {
  id: string;
  nombre: string;
  tipo: string;
  color: string;
  talla: string;
  estado: string;
}

interface Disfraz {
  id: string;
  nombre: string;
  tipoDisfraz: string;
  temporadaEvento: string;
  precioAlquiler: string;
  completo: boolean;
  prendasHogar: Prenda[];
}

export default function Catalogo() {
  const [disfraces, setDisfraces] = useState<Disfraz[]>([]);
  const [temporadasDisponibles, setTemporadasDisponibles] = useState<string[]>([]);
  const [tiposDisponibles, setTiposDisponibles] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [temporadasFiltro, setTemporadasFiltro] = useState<Set<string>>(new Set());
  const [tiposFiltro, setTiposFiltro] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const { usuario } = useAuth();
  const { agregarItem, items } = useCarrito();

  useEffect(() => {
    api.get("/disfraces/temporadas").then(({ data }) => setTemporadasDisponibles(data));
    api.get("/disfraces/tipos").then(({ data }) => setTiposDisponibles(data));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    const params: Record<string, string> = {};
    if (busqueda) params.nombre = busqueda;
    if (temporadasFiltro.size) params.temporadas = Array.from(temporadasFiltro).join(",");
    if (tiposFiltro.size) params.tipos = Array.from(tiposFiltro).join(",");
    const { data } = await api.get("/disfraces", { params });
    setDisfraces(data);
    setCargando(false);
  }, [busqueda, temporadasFiltro, tiposFiltro]);

  useEffect(() => {
    const timeout = setTimeout(cargar, 300);
    return () => clearTimeout(timeout);
  }, [cargar]);

  function toggle(set: Set<string>, valor: string, setter: (s: Set<string>) => void) {
    const copia = new Set(set);
    copia.has(valor) ? copia.delete(valor) : copia.add(valor);
    setter(copia);
  }

  function limpiarFiltros() {
    setBusqueda("");
    setTemporadasFiltro(new Set());
    setTiposFiltro(new Set());
  }

  const hayFiltrosActivos = busqueda !== "" || temporadasFiltro.size > 0 || tiposFiltro.size > 0;

  function handleAgregar(d: Disfraz) {
    agregarItem({
      disfrazFisicoId: d.id,
      nombre: d.nombre,
      tipoDisfraz: d.tipoDisfraz,
      precioAlquiler: Number(d.precioAlquiler),
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
          <label htmlFor="buscar-disfraz" className="visually-hidden">Buscar</label>
          <input
            id="buscar-disfraz"
            type="text"
            placeholder="Buscar…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <fieldset className="catalogo__grupo">
          <legend>Tipo de disfraz</legend>
          {tiposDisponibles.map((t) => (
            <label key={t} className="catalogo__checkbox">
              <input type="checkbox" checked={tiposFiltro.has(t)} onChange={() => toggle(tiposFiltro, t, setTiposFiltro)} />
              {t}
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
                onChange={() => toggle(temporadasFiltro, t, setTemporadasFiltro)}
              />
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </label>
          ))}
        </fieldset>
      </aside>

      <section aria-label="Resultados del catálogo" className="catalogo__resultados">
        {cargando ? (
          <p role="status">Cargando disfraces…</p>
        ) : disfraces.length === 0 ? (
          <p>No se encontraron disfraces con estos filtros.</p>
        ) : (
          <ul className="catalogo__grid">
            {disfraces.map((d) => {
              const enCarrito = items.some((i) => i.disfrazFisicoId === d.id);
              return (
                <li key={d.id} className="card catalogo__item">
                  <div className="catalogo__imagen" style={{ background: colorPorSemilla(d.temporadaEvento) }} aria-hidden="true">
                    <span className="catalogo__icono">{iconoPorTemporada(d.temporadaEvento)}</span>
                  </div>
                  <h3 style={{ fontSize: "1rem" }}>{d.nombre}</h3>
                  <p className="catalogo__meta">{d.tipoDisfraz} · Temporada: {d.temporadaEvento}</p>
                  <p className="catalogo__precio">S/ {d.precioAlquiler} / día</p>
                  <span className={`catalogo__estado ${d.completo ? "catalogo__estado--ok" : "catalogo__estado--incompleto"}`}>
                    {d.completo ? "Disponible" : "Incompleto — no disponible"}
                  </span>

                  <ul className="catalogo__prendas">
                    {d.prendasHogar.map((p) => (
                      <li key={p.id}>{p.nombre} · {p.color} · {p.talla}</li>
                    ))}
                  </ul>

                  {usuario ? (
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={!d.completo || enCarrito}
                      onClick={() => handleAgregar(d)}
                    >
                      {enCarrito ? "En el carrito" : "Agregar al carrito"}
                    </button>
                  ) : (
                    <Link to="/login" className="btn btn--ghost">Inicia sesión para alquilar</Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}