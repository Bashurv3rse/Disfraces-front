import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import { iconoPorTipo } from "../../lib/iconos";
import "./inventario-fisico.css";

interface Prenda {
  id: string;
  nombre: string;
  tipo: string;
  color: string;
  talla: string;
  calidad: string;
  estado: "DISPONIBLE" | "DANADA" | "FALTANTE";
}

type EstadoDisfraz = "DISPONIBLE" | "INCOMPLETO" | "ALQUILADO" | "EN_REPARACION" | "SUSPENDIDO";
type FaseLavado = "LAVADO" | "PLANCHADO" | "EMPAQUETADO" | null;

interface Disfraz {
  id: string;
  nombre: string;
  tipoDisfraz: string;
  precioAlquiler: string;
  estado: EstadoDisfraz;
  faseLavado: FaseLavado;
  faltantes: number;
  prestamosSalientes: number;
  prendasHogar: Prenda[];
  prendasActuales: Prenda[];
}

interface Candidato {
  id: string;
  nombre: string;
  calidad: string;
  color: string;
  talla: string;
  disfrazOrigenNombre: string;
  disfrazOrigenAlquilado: boolean;
}

const ETIQUETA_ESTADO: Record<EstadoDisfraz, string> = {
  DISPONIBLE: "Disponible",
  INCOMPLETO: "Incompleto",
  ALQUILADO: "Alquilado",
  EN_REPARACION: "En reparación",
  SUSPENDIDO: "Suspendido",
};

const ETIQUETA_FASE: Record<string, string> = {
  LAVADO: "Lavado (día 1/3)",
  PLANCHADO: "Planchado (día 2/3)",
  EMPAQUETADO: "Empaquetado (día 3/3)",
};

export default function InventarioFisico() {
  const [disfraces, setDisfraces] = useState<Disfraz[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [buscandoReemplazoPara, setBuscandoReemplazoPara] = useState<Prenda | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data } = await api.get("/disfraces");
    setDisfraces(data);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!seleccionadoId && disfraces.length > 0) setSeleccionadoId(disfraces[0].id);
  }, [disfraces, seleccionadoId]);

  const seleccionado = disfraces.find((d) => d.id === seleccionadoId) || null;
  const bloqueado = seleccionado?.estado === "ALQUILADO";

  const conteos = disfraces.reduce(
    (acc, d) => {
      acc[d.estado] = (acc[d.estado] || 0) + 1;
      return acc;
    },
    {} as Record<EstadoDisfraz, number>
  );

  const grupos = disfraces
    .filter((d) => d.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .reduce<Record<string, Disfraz[]>>((acc, d) => {
      (acc[d.tipoDisfraz] ??= []).push(d);
      return acc;
    }, {});

  function mostrarError(err: any) {
    setError(err.response?.data?.mensaje || "No se pudo completar la acción");
    setTimeout(() => setError(null), 4000);
  }

  async function marcarEstadoPrenda(prendaId: string, estado: "DISPONIBLE" | "FALTANTE") {
    try {
      await api.patch(`/disfraces/prendas/${prendaId}`, { estado });
      cargar();
    } catch (err: any) {
      mostrarError(err);
    }
  }

  async function abrirBuscarReemplazo(prenda: Prenda) {
    setBuscandoReemplazoPara(prenda);
    const { data } = await api.get(`/disfraces/prendas/${prenda.id}/candidatos`);
    setCandidatos(data);
  }

  async function confirmarPrestamo(candidatoId: string) {
    if (!buscandoReemplazoPara) return;
    try {
      await api.post(`/disfraces/prendas/${buscandoReemplazoPara.id}/prestamo`, { prendaDonanteId: candidatoId });
      setBuscandoReemplazoPara(null);
      setCandidatos([]);
      cargar();
    } catch (err: any) {
      mostrarError(err);
    }
  }

  async function marcarListo(disfrazId: string) {
    try {
      await api.patch(`/disfraces/${disfrazId}/estado-manual`, { estado: null });
      cargar();
    } catch (err: any) {
      mostrarError(err);
    }
  }

  async function marcarEnReparacion(disfrazId: string) {
    try {
      await api.patch(`/disfraces/${disfrazId}/estado-manual`, { estado: "EN_REPARACION" });
      cargar();
    } catch (err: any) {
      mostrarError(err);
    }
  }

  return (
    <div>
      <div className="inventario__resumen">
        {(["DISPONIBLE", "INCOMPLETO", "ALQUILADO", "EN_REPARACION"] as EstadoDisfraz[]).map((e) => (
          <div key={e} className={`inventario__resumen-pill inventario__resumen-pill--${e.toLowerCase()}`}>
            <span className="inventario__resumen-dot" />
            {ETIQUETA_ESTADO[e]} <strong>{conteos[e] || 0}</strong>
          </div>
        ))}
      </div>

      {error && <div className="alert alert--danger" role="alert" style={{ marginBottom: "var(--space-4)" }}>{error}</div>}

      <div className="inventario">
        <aside className="inventario__sidebar">
          <h1 style={{ fontSize: "1.1rem", marginBottom: "var(--space-3)" }}>Inventario Físico</h1>
          <input
            type="text"
            placeholder="Buscar disfraz…"
            className="inventario__buscar"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          {cargando ? (
            <p role="status">Cargando…</p>
          ) : (
            Object.entries(grupos).map(([tipo, lista]) => (
              <div key={tipo} className="inventario__grupo">
                <h2 className="inventario__grupo-titulo">{tipo}</h2>
                {lista.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`inventario__disfraz-btn ${d.id === seleccionadoId ? "inventario__disfraz-btn--activo" : ""}`}
                    onClick={() => setSeleccionadoId(d.id)}
                  >
                    <span className="inventario__disfraz-nombre">
                      {d.nombre}
                      {d.prestamosSalientes > 0 && (
                        <span className="inventario__prestamo-alerta" title={`Prestó ${d.prestamosSalientes} pieza(s) a otro disfraz`}>
                          ⚠
                        </span>
                      )}
                    </span>
                    <span className={`inventario__estado-badge inventario__estado-badge--${d.estado.toLowerCase()}`}>
                      {d.estado === "INCOMPLETO"
                        ? `${d.faltantes} falt.`
                        : d.estado === "SUSPENDIDO" && d.faseLavado
                        ? ETIQUETA_FASE[d.faseLavado]
                        : ETIQUETA_ESTADO[d.estado]}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </aside>

        <section className="inventario__detalle">
          {!seleccionado ? (
            <p style={{ color: "var(--text-muted)" }}>Selecciona un disfraz para ver el detalle.</p>
          ) : (
            <>
              <div className="inventario__detalle-header">
                <div>
                  <div className="inventario__detalle-titulo">
                    <h2>{seleccionado.nombre}</h2>
                    <span className={`inventario__estado-badge inventario__estado-badge--${seleccionado.estado.toLowerCase()}`}>
                      {seleccionado.estado === "SUSPENDIDO" && seleccionado.faseLavado
                        ? ETIQUETA_FASE[seleccionado.faseLavado]
                        : ETIQUETA_ESTADO[seleccionado.estado]}
                    </span>
                  </div>
                  <p style={{ color: "var(--text-muted)" }}>S/ {seleccionado.precioAlquiler}/día · {seleccionado.tipoDisfraz}</p>
                  {seleccionado.prestamosSalientes > 0 && (
                    <p className="inventario__prestamo-nota">
                      ⚠ Este disfraz prestó {seleccionado.prestamosSalientes} pieza(s) a otro disfraz.
                    </p>
                  )}
                </div>
                {!bloqueado && (
                  <div className="inventario__detalle-acciones">
                    {seleccionado.estado === "SUSPENDIDO" && (
                      <button type="button" className="btn btn--primary" onClick={() => marcarListo(seleccionado.id)}>
                        Marcar como listo
                      </button>
                    )}
                    {seleccionado.estado === "EN_REPARACION" ? (
                      <button type="button" className="btn btn--ghost" onClick={() => marcarListo(seleccionado.id)}>
                        Salir de reparación
                      </button>
                    ) : (
                      seleccionado.estado !== "SUSPENDIDO" && (
                        <button type="button" className="btn btn--ghost" onClick={() => marcarEnReparacion(seleccionado.id)}>
                          Marcar en reparación
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              {bloqueado && (
                <div className="inventario__bloqueado-aviso">
                  🔒 Este disfraz está alquilado — no se puede modificar hasta que el cliente lo devuelva a la tienda.
                </div>
              )}

              <div className="inventario__prendas">
                {seleccionado.prendasHogar.map((p) => {
                  const actual = seleccionado.prendasActuales.find((pa) => pa.id === p.id);
                  const presente = !!actual && actual.estado === "DISPONIBLE";
                  const prestada = actual ? actual.estado === "DISPONIBLE" && p.id === actual.id : false;

                  return (
                    <div key={p.id} className={`inventario__prenda ${!presente ? "inventario__prenda--alerta" : ""}`}>
                      <div className="inventario__prenda-info">
                        <span className="inventario__prenda-icono">{iconoPorTipo(p.tipo)}</span>
                        <div>
                          <strong>{p.nombre}</strong>
                          <span className="inventario__prenda-meta">{p.color} · {p.talla} · tipo: {p.tipo.toLowerCase()}</span>
                        </div>
                        <span className="inventario__pill">{p.calidad}</span>
                        <span className={`inventario__pill ${presente ? "inventario__pill--ok" : "inventario__pill--no"}`}>
                          {presente ? "Presente" : "Faltante"}
                        </span>
                      </div>

                      {!bloqueado && (
                        <div className="inventario__prenda-acciones">
                          {presente ? (
                            <button type="button" className="btn btn--ghost" onClick={() => marcarEstadoPrenda(p.id, "FALTANTE")}>
                              Marcar faltante
                            </button>
                          ) : (
                            <>
                              <button type="button" className="btn btn--ghost" onClick={() => marcarEstadoPrenda(p.id, "DISPONIBLE")}>
                                Marcar presente
                              </button>
                              <button type="button" className="btn btn--primary" onClick={() => abrirBuscarReemplazo(p)}>
                                Buscar reemplazo →
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {!presente && (
                        <p className="inventario__prenda-aviso">
                          Esta prenda requerida está faltante. Este disfraz no puede alquilarse hasta resolverlo.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {buscandoReemplazoPara && (
        <div className="inventario-overlay" onClick={() => setBuscandoReemplazoPara(null)}>
          <div className="inventario-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="inventario-modal__header">
              <div>
                <span className="inventario-modal__eyebrow">Buscando reemplazo para</span>
                <h2>{buscandoReemplazoPara.nombre}</h2>
                <p className="inventario-modal__sub">de {seleccionado?.nombre} · tipo genérico: {buscandoReemplazoPara.tipo.toLowerCase()}</p>
              </div>
              <button type="button" className="inventario-modal__cerrar" onClick={() => setBuscandoReemplazoPara(null)} aria-label="Cerrar">×</button>
            </div>

            <p className="inventario-modal__nota">
              Al confirmar el préstamo, la prenda seleccionada se moverá físicamente a <strong>{seleccionado?.nombre}</strong>. El disfraz donante quedará incompleto y no podrá alquilarse hasta que se resuelva.
            </p>

            {candidatos.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No hay ninguna prenda disponible de este tipo en otro disfraz.</p>
            ) : (
              <p className="inventario-modal__contador">{candidatos.length} candidato(s) encontrado(s):</p>
            )}

            <div className="inventario-modal__lista">
              {candidatos.map((c, i) => (
                <div key={c.id} className={`inventario-candidato ${i === 0 ? "inventario-candidato--top" : ""}`}>
                  <div className="inventario-candidato__info">
                    <div className="inventario-candidato__tags">
                      {i === 0 && <span className="inventario-pill inventario-pill--top">✓ Mejor opción</span>}
                      <span className="inventario-pill">{c.calidad}</span>
                    </div>
                    <strong>{c.nombre}</strong>
                    <span className="inventario-candidato__meta">de {c.disfrazOrigenNombre}</span>
                    {c.disfrazOrigenAlquilado && (
                      <span className="inventario-pill inventario-pill--alerta">⚠ {c.disfrazOrigenNombre} está alquilado ahora</span>
                    )}
                    {!c.disfrazOrigenAlquilado && (
                      <span className="inventario-pill inventario-pill--aviso">⚠ {c.disfrazOrigenNombre} quedará Incompleto</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={c.disfrazOrigenAlquilado}
                    onClick={() => confirmarPrestamo(c.id)}
                  >
                    Confirmar préstamo
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}