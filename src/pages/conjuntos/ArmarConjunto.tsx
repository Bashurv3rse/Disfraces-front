import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useCarrito } from "../../lib/CarritoContext";
import { useAuth } from "../../lib/AuthContext";
import { tallasPorDefecto, coloresPorDefecto } from "../../lib/opciones";
import "./armar-conjunto.css";

interface Pieza {
  id: string;
  nombre: string;
  tipo: string;
  tallaEEUU: string;
  color: string;
  temporadaOriginal: string;
  stock: number;
  precioAlquiler: number;
  tallasDisponibles: string[];
  coloresDisponibles: string[];
}

export default function ArmarConjunto() {
  const [piezasDisponibles, setPiezasDisponibles] = useState<Pieza[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [tallaPorPieza, setTallaPorPieza] = useState<Record<string, string>>({});
  const [colorPorPieza, setColorPorPieza] = useState<Record<string, string>>({});
  const [nombre, setNombre] = useState("");
  const [temporadaEvento, setTemporadaEvento] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const { agregarItem } = useCarrito();
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "ADMINISTRADOR";
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/catalogo").then(({ data }) => setPiezasDisponibles(data));
  }, []);

  function opcionesTalla(p: Pieza) {
    return p.tallasDisponibles?.length ? p.tallasDisponibles : tallasPorDefecto(p.tipo);
  }
  function opcionesColor(p: Pieza) {
    return p.coloresDisponibles?.length ? p.coloresDisponibles : coloresPorDefecto();
  }

  function toggleSeleccion(id: string) {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      copia.has(id) ? copia.delete(id) : copia.add(id);
      return copia;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (seleccionadas.size === 0) {
      setError("Selecciona al menos una pieza para armar el conjunto");
      return;
    }

    if (esAdmin) {
      setGuardando(true);
      try {
        await api.post("/conjuntos", {
          nombre,
          tipo: "PREDETERMINADO",
          temporadaEvento,
          piezaIds: Array.from(seleccionadas),
        });
        navigate("/conjuntos");
      } catch (err: any) {
        setError(err.response?.data?.mensaje || "No se pudo crear el conjunto");
      } finally {
        setGuardando(false);
      }
      return;
    }

    const piezasElegidas = piezasDisponibles.filter((p) => seleccionadas.has(p.id));
    agregarItem({
      nombreConjunto: nombre || "Conjunto personalizado",
      piezas: piezasElegidas.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        tipo: p.tipo,
        tallaEEUU: tallaPorPieza[p.id] || opcionesTalla(p)[0],
        color: colorPorPieza[p.id] || opcionesColor(p)[0],
        precioAlquiler: p.precioAlquiler,
      })),
    });
    navigate("/catalogo");
  }

  const piezasPorTemporada = piezasDisponibles.reduce<Record<string, Pieza[]>>((acc, p) => {
    (acc[p.temporadaOriginal] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-2)" }}>
        {esAdmin ? "Crear conjunto predeterminado" : "Armar conjunto personalizado"}
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
        {esAdmin
          ? "Este conjunto se agregará al catálogo oficial de temporada."
          : "Combina piezas de distintas temporadas para crear tu propio conjunto."}
      </p>

      {error && (
        <div className="alert alert--danger" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="armar__datos">
          <div className="field">
            <label htmlFor="nombre-conjunto">Nombre del conjunto</label>
            <input
              id="nombre-conjunto"
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          {esAdmin && (
            <div className="field">
              <label htmlFor="evento-conjunto">Temporada / evento</label>
              <input
                id="evento-conjunto"
                type="text"
                placeholder="ej. halloween"
                required
                value={temporadaEvento}
                onChange={(e) => setTemporadaEvento(e.target.value)}
              />
            </div>
          )}
        </div>

        <fieldset className="armar__fieldset">
          <legend>Selecciona las piezas ({seleccionadas.size} seleccionadas)</legend>

          {Object.entries(piezasPorTemporada).map(([temporada, piezas]) => (
            <div key={temporada} className="armar__grupo">
              <h2 className="armar__grupo-titulo">{temporada}</h2>
              <div className="armar__grid">
                {piezas.map((p) => {
                  const seleccionada = seleccionadas.has(p.id);
                  return (
                    <div key={p.id} className={`armar__pieza ${seleccionada ? "armar__pieza--activa" : ""}`}>
                      <label className="armar__pieza-check">
                        <input
                          type="checkbox"
                          checked={seleccionada}
                          onChange={() => toggleSeleccion(p.id)}
                          disabled={p.stock === 0}
                        />
                        <span>
                          <strong>{p.nombre}</strong>
                          <span className="armar__pieza-meta">
                            {p.tipo.replace("_", " / ")} · S/{p.precioAlquiler}/d
                            {p.stock === 0 && " · sin stock"}
                          </span>
                        </span>
                      </label>

                      {seleccionada && !esAdmin && (
                        <div className="armar__pieza-variantes">
                          <select
                            aria-label={`Talla de ${p.nombre}`}
                            value={tallaPorPieza[p.id] || opcionesTalla(p)[0]}
                            onChange={(e) => setTallaPorPieza((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          >
                            {opcionesTalla(p).map((t) => (
                              <option key={t} value={t}>Talla {t}</option>
                            ))}
                          </select>
                          <select
                            aria-label={`Color de ${p.nombre}`}
                            value={colorPorPieza[p.id] || opcionesColor(p)[0]}
                            onChange={(e) => setColorPorPieza((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          >
                            {opcionesColor(p).map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </fieldset>

        <button type="submit" className="btn btn--primary" disabled={guardando}>
          {esAdmin ? (guardando ? "Creando…" : "Crear conjunto") : "Agregar conjunto al carrito"}
        </button>
      </form>
    </div>
  );
}