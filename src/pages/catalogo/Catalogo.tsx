import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { useCarrito } from "../../lib/CarritoContext";
import { iconoPorTemporada, colorPorSemilla } from "../../lib/iconos";
import { OfertasBanner } from "../../components/OfertasBanner";
import { agruparDisfraces, bloqueoDe, estaDisponible, estadoVisible, tallaDe } from "../../lib/agruparDisfraces";
import type { DisfrazCat, GrupoDisfraz } from "../../lib/agruparDisfraces";
import { DetalleDisfrazModal } from "./DetalleDisfrazModal";
import "./catalogo.css";

type Disfraz = DisfrazCat;

const ETIQUETA_ESTADO: Record<string, string> = {
  DISPONIBLE: "Disponible",
  INCOMPLETO: "Incompleto",
  ALQUILADO: "Alquilado",
  EN_REPARACION: "En reparación",
  SUSPENDIDO: "No disponible por ahora",
  RESERVADO: "Reservado",
};

export default function Catalogo() {
  const [disfraces, setDisfraces] = useState<Disfraz[]>([]);
  const [imagenesFallidas, setImagenesFallidas] = useState<Set<string>>(new Set());
  const [temporadasDisponibles, setTemporadasDisponibles] = useState<string[]>([]);
  const [tiposDisponibles, setTiposDisponibles] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [temporadasFiltro, setTemporadasFiltro] = useState<Set<string>>(new Set());
  const [tiposFiltro, setTiposFiltro] = useState<Set<string>>(new Set());
  const [detalle, setDetalle] = useState<string | null>(null); // clave del grupo abierto

  const [cargando, setCargando] = useState(true);
  const { usuario } = useAuth();
  const carrito = useCarrito();
  const { agregarItem, items } = carrito;

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

  const cantidadFiltros = (busqueda ? 1 : 0) + temporadasFiltro.size + tiposFiltro.size;
  const hayFiltrosActivos = busqueda !== "" || temporadasFiltro.size > 0 || tiposFiltro.size > 0;

  const grupos = useMemo(() => agruparDisfraces(disfraces), [disfraces]);
  const grupoAbierto: GrupoDisfraz | undefined = grupos.find((g) => g.clave === detalle);

  function handleAgregar(d: Disfraz) {
    agregarItem({
      disfrazFisicoId: d.id,
      nombre: d.nombre,
      tipoDisfraz: d.tipoDisfraz,
      precioAlquiler: Number(d.precioAlquiler),
      tallaRopa: tallaDe(d, "ROPA") ?? undefined,
      tallaCalzado: tallaDe(d, "CALZADO") ?? undefined,
    });
  }

  return (
    <div className="catalogo">
      <aside className="catalogo__filtros" aria-label="Filtros de catálogo">
        <div className="catalogo__filtros-header">
          <h2 style={{ fontSize: "1.1rem" }}>
            Filtros
            {cantidadFiltros > 0 && <span className="catalogo__contador">{cantidadFiltros}</span>}
          </h2>
          {hayFiltrosActivos && (
            <button type="button" className="catalogo__limpiar" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="field catalogo__buscador">
          <label htmlFor="buscar-disfraz" className="visually-hidden">Buscar</label>
          <span className="catalogo__lupa" aria-hidden="true">🔍</span>
          <input
            id="buscar-disfraz"
            type="text"
            placeholder="Buscar…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <details className="catalogo__seccion" open>
          <summary>
            Tipo de disfraz
            {tiposFiltro.size > 0 && <span className="catalogo__contador">{tiposFiltro.size}</span>}
          </summary>
          <div className="catalogo__chips">
            {tiposDisponibles.map((t) => (
              <label key={t} className={`catalogo__chip${tiposFiltro.has(t) ? " catalogo__chip--activo" : ""}`}>
                <input type="checkbox" checked={tiposFiltro.has(t)} onChange={() => toggle(tiposFiltro, t, setTiposFiltro)} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </details>

        <details className="catalogo__seccion" open>
          <summary>
            Temporada
            {temporadasFiltro.size > 0 && <span className="catalogo__contador">{temporadasFiltro.size}</span>}
          </summary>
          <div className="catalogo__chips">
            {temporadasDisponibles.map((t) => (
              <label key={t} className={`catalogo__chip${temporadasFiltro.has(t) ? " catalogo__chip--activo" : ""}`}>
                <input
                  type="checkbox"
                  checked={temporadasFiltro.has(t)}
                  onChange={() => toggle(temporadasFiltro, t, setTemporadasFiltro)}
                />
                <span className="catalogo__chip-icono" aria-hidden="true">{iconoPorTemporada(t)}</span>
                <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
              </label>
            ))}
          </div>
        </details>
      </aside>

      <section aria-label="Resultados del catálogo" className="catalogo__resultados">
        <OfertasBanner />
        <p className="catalogo__a-medida">
          ¿No encuentras tu disfraz? <Link to="/a-medida">Pídelo a medida</Link> y lo armamos con piezas de tu talla.
        </p>
        {cargando ? (
          <p role="status">Cargando disfraces…</p>
        ) : disfraces.length === 0 ? (
          <p>No se encontraron disfraces con estos filtros.</p>
        ) : (
          <ul className="catalogo__grid">
            {grupos.map((g) => {
              const d = g.representante;
              const hayDisponible = g.variantes.some(estaDisponible);
              return (
                <li key={g.clave} className="card catalogo__item">
                  {d.imagenUrl && !imagenesFallidas.has(d.imagenUrl) ? (
                    <img
                      src={d.imagenUrl}
                      onError={() => setImagenesFallidas((prev) => new Set(prev).add(d.imagenUrl!))}
                      alt={g.nombre}
                      className="catalogo__foto"
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={220}
                    />
                  ) : (
                    <div className="catalogo__imagen" style={{ background: colorPorSemilla(d.temporadaEvento) }} aria-hidden="true">
                      <span className="catalogo__icono">{iconoPorTemporada(d.temporadaEvento)}</span>
                    </div>
                  )}
                  <h3 style={{ fontSize: "1rem" }}>{g.nombre}</h3>
                  <p className="catalogo__meta">{d.tipoDisfraz} · Temporada: {d.temporadaEvento}</p>
                  <p className="catalogo__precio">S/ {d.precioAlquiler} / día</p>
                  <span className={`catalogo__estado ${hayDisponible ? "catalogo__estado--ok" : "catalogo__estado--incompleto"}`}>
                    {hayDisponible ? "Disponible" : g.variantes.some((v) => !bloqueoDe(v)) ? "Ocupado hoy" : ETIQUETA_ESTADO[estadoVisible(d)]}
                  </span>
                  <button type="button" className="btn btn--primary" onClick={() => setDetalle(g.clave)}>
                    Ver detalle
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {grupoAbierto && (
        <DetalleDisfrazModal
          grupo={grupoAbierto}
          sesionIniciada={!!usuario}
          idsEnCarrito={items.map((i) => i.disfrazFisicoId)}
          onAgregar={(d) => {
            handleAgregar(d);
            setDetalle(null);
          }}
          onCerrar={() => setDetalle(null)}
        />
      )}
    </div>
  );
}
