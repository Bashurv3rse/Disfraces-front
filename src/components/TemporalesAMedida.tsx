import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { resumenTallas } from "../lib/prendas";

interface Temporal {
  id: string;
  nombre: string;
  cliente: { nombre: string; email: string };
  estado: "ALQUILADO" | "EN_LAVADO" | "POR_DESARMAR";
  fechaInicio: string | null;
  fechaFin: string | null;
  lavadoHasta: string | null;
  prendas: { id: string; nombre: string; color: string; talla: string; origen: string }[];
}

const ETIQUETA: Record<Temporal["estado"], string> = {
  ALQUILADO: "Alquilado",
  EN_LAVADO: "En lavado",
  POR_DESARMAR: "Por desarmar",
};

const dia = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { timeZone: "UTC" });

// Disfraces armados a medida que existen mientras están alquilados o en lavado. Al desarmarse
// (las piezas vuelven al almacén) desaparecen de esta lista solos.
export function TemporalesAMedida() {
  const [lista, setLista] = useState<Temporal[] | null>(null);

  useEffect(() => {
    let vigente = true;
    api
      .get<Temporal[]>("/disfraces/a-medida-temporales")
      .then(({ data }) => vigente && setLista(data))
      .catch(() => vigente && setLista([]));
    return () => {
      vigente = false;
    };
  }, []);

  if (!lista || lista.length === 0) return null;

  return (
    <section className="inventario__temporales" aria-label="Disfraces a medida en curso">
      <h2 className="inventario__grupo-titulo">A medida (temporales) · {lista.length}</h2>
      <p className="inventario__temporales-nota">Existen solo mientras están alquilados o en lavado.</p>
      {lista.map((t) => {
        const { ropa, calzado } = resumenTallas(t.prendas.map((p) => p.talla));
        return (
          <details key={t.id} className="inventario__temporal">
            <summary>
              <span>{t.nombre}</span>
              <span className={`inventario__estado-badge inventario__estado-badge--${t.estado === "ALQUILADO" ? "alquilado" : "suspendido"}`}>
                {ETIQUETA[t.estado]}
              </span>
            </summary>
            <p>
              {t.cliente.nombre} ({t.cliente.email})
              {t.fechaInicio && t.fechaFin && <> · del {dia(t.fechaInicio)} al {dia(t.fechaFin)}</>}
              {t.estado === "EN_LAVADO" && t.lavadoHasta && <> · lavado hasta el {dia(t.lavadoHasta)}</>}
            </p>
            {(ropa || calzado) && (
              <p>
                {ropa && <>Ropa {ropa}</>}
                {ropa && calzado && " · "}
                {calzado && <>Calzado {calzado}</>}
              </p>
            )}
            <ul>
              {t.prendas.map((p) => (
                <li key={p.id}>
                  {p.nombre} · {p.color} · {p.talla === "única" ? "talla única" : `talla ${p.talla}`}
                  {p.origen && <small> (del almacén: {p.origen})</small>}
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </section>
  );
}
