import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import "./conjuntos.css";

interface PiezaResumen {
  pieza: { id: string; nombre: string; tipo: string; tallaEEUU: string; color: string };
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
              <h2 style={{ fontSize: "1.05rem" }}>{c.nombre}</h2>
              <p className="conjuntos__temporada">{c.temporadaEvento}</p>
              <ul className="conjuntos__piezas">
                {c.piezas.map((cp) => (
                  <li key={cp.pieza.id}>
                    {cp.pieza.nombre} · {cp.pieza.tallaEEUU} · {cp.pieza.color}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}