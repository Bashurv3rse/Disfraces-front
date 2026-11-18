import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Evento {
  fecha: string;
  categoria: string;
  titulo: string;
  detalle: string;
}

const ETIQUETA: Record<string, string> = {
  REGISTRO: "Registro",
  ESTADO: "Estado",
  PRENDA: "Prendas",
  PRESTAMO: "Préstamo",
  ALQUILER: "Alquiler",
  DEVOLUCION: "Devolución",
  INCIDENCIA: "Incidencia",
  DISPONIBILIDAD: "Disponibilidad",
};

function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

// Línea de tiempo del disfraz para el administrador (solo disfraces del catálogo principal).
export function HistorialDisfraz({ disfrazId }: { disfrazId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("TODOS");

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    setEventos(null);
    setError(null);
    api
      .get<{ eventos: Evento[] }>(`/disfraces/${disfrazId}/historial`)
      .then(({ data }) => vigente && setEventos(data.eventos))
      .catch(() => vigente && setError("No se pudo cargar el historial de este disfraz."));
    return () => {
      vigente = false;
    };
  }, [abierto, disfrazId]);

  const visibles = (eventos ?? []).filter((e) => filtro === "TODOS" || e.categoria === filtro);

  return (
    <section className="historial-disfraz">
      <button type="button" className="btn btn--ghost" aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}>
        {abierto ? "Ocultar historial" : "Historial"}
      </button>

      {abierto && (
        <div className="historial-disfraz__cuerpo">
          {error && <p role="alert">{error}</p>}
          {!error && eventos === null && <p role="status">Cargando historial…</p>}
          {eventos && (
            <>
              <div className="field">
                <label htmlFor="historial-filtro">Mostrar</label>
                <select id="historial-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                  <option value="TODOS">Todo</option>
                  {Object.entries(ETIQUETA).map(([valor, texto]) => (
                    <option key={valor} value={valor}>{texto}</option>
                  ))}
                </select>
              </div>
              {visibles.length === 0 ? (
                <p>No hay eventos para mostrar.</p>
              ) : (
                <ol className="historial-disfraz__lista">
                  {visibles.map((e, i) => (
                    <li key={`${e.fecha}-${i}`} className="historial-disfraz__evento">
                      <span className="historial-disfraz__fecha">{fechaHora(e.fecha)}</span>
                      <span className="historial-disfraz__tipo">{ETIQUETA[e.categoria] ?? e.categoria}</span>
                      <strong>{e.titulo}</strong>
                      <p>{e.detalle}</p>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
