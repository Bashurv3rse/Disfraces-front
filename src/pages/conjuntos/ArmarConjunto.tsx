import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import "./armar-conjunto.css";

interface Pieza {
  id: string;
  nombre: string;
  tipo: string;
  tallaEEUU: string;
  color: string;
  temporadaOriginal: string;
  stock: number;
}

export default function ArmarConjunto() {
  const [piezasDisponibles, setPiezasDisponibles] = useState<Pieza[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [nombre, setNombre] = useState("");
  const [temporadaEvento, setTemporadaEvento] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/catalogo").then(({ data }) => setPiezasDisponibles(data));
  }, []);

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

    setGuardando(true);
    try {
      await api.post("/conjuntos", {
        nombre,
        tipo: "PERSONALIZADO",
        temporadaEvento,
        piezaIds: Array.from(seleccionadas),
      });
      navigate("/conjuntos");
    } catch (err: any) {
      setError(err.response?.data?.mensaje || "No se pudo crear el conjunto personalizado");
    } finally {
      setGuardando(false);
    }
  }

  // Agrupamos por temporada original solo para mostrar visualmente
  // que las piezas pueden venir de eventos distintos y aun así combinarse.
  const piezasPorTemporada = piezasDisponibles.reduce<Record<string, Pieza[]>>((acc, p) => {
    (acc[p.temporadaOriginal] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-2)" }}>Armar conjunto personalizado</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
        Combina piezas de distintas temporadas para crear tu propio conjunto.
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
          <div className="field">
            <label htmlFor="evento-conjunto">Evento / temporada para el que lo usarás</label>
            <input
              id="evento-conjunto"
              type="text"
              placeholder="ej. fiesta de fin de año"
              required
              value={temporadaEvento}
              onChange={(e) => setTemporadaEvento(e.target.value)}
            />
          </div>
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
                    <label key={p.id} className={`armar__pieza ${seleccionada ? "armar__pieza--activa" : ""}`}>
                      <input
                        type="checkbox"
                        checked={seleccionada}
                        onChange={() => toggleSeleccion(p.id)}
                        disabled={p.stock === 0}
                      />
                      <span>
                        <strong>{p.nombre}</strong>
                        <span className="armar__pieza-meta">
                          {p.tipo.replace("_", " / ")} · {p.tallaEEUU} · {p.color}
                          {p.stock === 0 && " · sin stock"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </fieldset>

        <button type="submit" className="btn btn--primary" disabled={guardando}>
          {guardando ? "Guardando…" : "Crear conjunto personalizado"}
        </button>
      </form>
    </div>
  );
}