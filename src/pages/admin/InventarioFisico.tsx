import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../../lib/api";
import { iconoPorTipo } from "../../lib/iconos";
import "./inventario-fisico.css";
import { Link } from "react-router-dom";

type EstadoDisfraz = "DISPONIBLE" | "INCOMPLETO" | "ALQUILADO" | "RESERVADO" | "EN_REPARACION" | "SUSPENDIDO";
type FaseLavado = "LAVADO" | "PLANCHADO" | "EMPAQUETADO" | null;
type SituacionPrenda = "PRESENTE" | "REEMPLAZADA" | "FALTANTE" | "DANADA" | "PRESTADA";

interface DisfrazLista {
  id: string;
  nombre: string;
  tipoDisfraz: string;
  estado: EstadoDisfraz;
  faseLavado: FaseLavado;
  faltantes: number;
  prestamosSalientes: number;
}

interface PrendaAjena {
  id: string;
  nombre: string;
  color: string;
  talla: string;
  origenId: string;
  origenNombre: string;
}

interface PrendaDetalle {
  id: string;
  nombre: string;
  tipo: string;
  color: string;
  talla: string;
  calidad: string;
  estado: "DISPONIBLE" | "DANADA" | "FALTANTE";
  situacion: SituacionPrenda;
  prestadaA: { id: string; nombre: string; aMedida: boolean } | null;
  reemplazo: PrendaAjena | null;
  apartada: boolean;
}

interface PrestamoRecibido {
  id: string;
  nombre: string;
  tipo: string;
  color: string;
  talla: string;
  estado: string;
  origenId: string;
  origenNombre: string;
  reemplazaA: string | null;
  sobrante: boolean;
  puedeDevolverse: boolean;
  apartada: boolean;
}

interface DetalleInventario {
  id: string;
  nombre: string;
  familia: string | null;
  grupoCompatibilidad: string | null;
  tipoDisfraz: string;
  precioAlquiler: string;
  estado: EstadoDisfraz;
  faseLavado: FaseLavado;
  faltantes: number;
  prestamosSalientes: number;
  prendas: PrendaDetalle[];
  prestamosRecibidos: PrestamoRecibido[];
}

interface Candidato {
  id: string;
  nombre: string;
  calidad: string;
  color: string;
  talla: string;
  disfrazOrigenNombre: string;
  disfrazOrigenAlquilado: boolean;
  mismaFamilia: boolean;
  mismaTalla: boolean;
  mismoColor: boolean;
  esAlmacen: boolean;
}

const ETIQUETA_ESTADO: Record<EstadoDisfraz, string> = {
  DISPONIBLE: "Disponible",
  INCOMPLETO: "Incompleto",
  ALQUILADO: "Alquilado",
  EN_REPARACION: "En reparación",
  SUSPENDIDO: "Suspendido",
  RESERVADO: "Reservado",
};

const ETIQUETA_FASE: Record<string, string> = {
  LAVADO: "Lavado (día 1/3)",
  PLANCHADO: "Planchado (día 2/3)",
  EMPAQUETADO: "Empaquetado (día 3/3)",
};

function mensajeDe(err: unknown, porDefecto = "No se pudo completar la acción"): string {
  return (err as { response?: { data?: { mensaje?: string } } })?.response?.data?.mensaje || porDefecto;
}

function textoEstado(d: { estado: EstadoDisfraz; faseLavado: FaseLavado; faltantes: number }, resumido: boolean): string {
  if (resumido && d.estado === "INCOMPLETO") return `${d.faltantes} falt.`;
  if (d.estado === "SUSPENDIDO" && d.faseLavado) return ETIQUETA_FASE[d.faseLavado];
  return ETIQUETA_ESTADO[d.estado];
}

// Orden natural: por tipo y luego por nombre, de modo que "#2" queda antes que "#10".
function ordenar(lista: DisfrazLista[]): DisfrazLista[] {
  return [...lista].sort(
    (a, b) =>
      a.tipoDisfraz.localeCompare(b.tipoDisfraz, "es") || a.nombre.localeCompare(b.nombre, "es", { numeric: true })
  );
}

interface TarjetaPrendaProps {
  prenda: PrendaDetalle;
  bloqueado: boolean;
  procesando: boolean;
  onMarcar: (estado: "DISPONIBLE" | "FALTANTE") => void;
  onBuscarReemplazo: () => void;
  onRecuperar: () => void;
}

function TarjetaPrenda({ prenda: p, bloqueado, procesando, onMarcar, onBuscarReemplazo, onRecuperar }: TarjetaPrendaProps) {
  const { situacion } = p;

  const clase =
    situacion === "PRESENTE"
      ? ""
      : situacion === "REEMPLAZADA"
      ? "inventario__prenda--reemplazada"
      : situacion === "PRESTADA"
      ? "inventario__prenda--prestada"
      : "inventario__prenda--alerta";

  const etiquetaPill: Record<SituacionPrenda, { texto: string; clase: string }> = {
    PRESENTE: { texto: "Presente", clase: "inventario__pill--ok" },
    REEMPLAZADA: { texto: "Reemplazada", clase: "inventario__pill--info" },
    FALTANTE: { texto: "Faltante", clase: "inventario__pill--no" },
    DANADA: { texto: "Dañada", clase: "inventario__pill--no" },
    PRESTADA: { texto: "Prestada", clase: "inventario__pill--prestada" },
  };
  const pill = etiquetaPill[situacion];

  const textoRecuperada = p.estado === "DANADA" ? "Marcar reparada" : "Marcar presente";
  const sinReemplazo = situacion === "FALTANTE" || situacion === "DANADA" || (situacion === "PRESTADA" && !p.reemplazo);

  return (
    <div className={`inventario__prenda ${clase}`}>
      <div className="inventario__prenda-info">
        <span className="inventario__prenda-icono" aria-hidden="true">{iconoPorTipo(p.tipo)}</span>
        <div>
          <strong>{p.nombre}</strong>
          <span className="inventario__prenda-meta">{p.color} · {p.talla} · tipo: {p.tipo.toLowerCase()}</span>
        </div>
        <span className="inventario__pill">{p.calidad}</span>
        <span className={`inventario__pill ${pill.clase}`}>{pill.texto}</span>
      </div>

      {situacion === "REEMPLAZADA" && p.reemplazo && (
        <p className="inventario__prenda-nota">
          Cubierta por <strong>{p.reemplazo.nombre}</strong> ({p.reemplazo.color} · {p.reemplazo.talla}), de{" "}
          <strong>{p.reemplazo.origenNombre}</strong>.
        </p>
      )}

      {situacion === "PRESTADA" && p.prestadaA && (
        <p className="inventario__prenda-nota">
          Esta prenda está en <strong>{p.prestadaA.nombre}</strong>
          {p.prestadaA.aMedida ? " (disfraz a medida: vuelve sola cuando se desarme)." : "."}{" "}
          {p.reemplazo ? (
            <>
              Este disfraz usa <strong>{p.reemplazo.nombre}</strong> (de {p.reemplazo.origenNombre}) en su lugar.
            </>
          ) : (
            "Sin reemplazo: este disfraz está incompleto."
          )}
        </p>
      )}
      {p.apartada && (
        <p className="inventario__prenda-nota">
          Apartada por una reserva (ajuste de talla o disfraz a medida): vuelve sola a su lugar cuando termine.
        </p>
      )}

      {!bloqueado && !p.apartada && (
        <div className="inventario__prenda-acciones">
          {situacion === "PRESENTE" && (
            <button type="button" className="btn btn--ghost" disabled={procesando} onClick={() => onMarcar("FALTANTE")}>
              Marcar faltante
            </button>
          )}

          {(situacion === "REEMPLAZADA" || situacion === "FALTANTE" || situacion === "DANADA") && (
            <button type="button" className="btn btn--ghost" disabled={procesando} onClick={() => onMarcar("DISPONIBLE")}>
              {textoRecuperada}
            </button>
          )}

          {situacion === "PRESTADA" && (
            <button
              type="button"
              className="btn btn--ghost"
              disabled={procesando || p.estado !== "DISPONIBLE" || !!p.prestadaA?.aMedida}
              title={
                p.prestadaA?.aMedida
                  ? "Está en un disfraz a medida: vuelve sola al terminar su lavado"
                  : p.estado !== "DISPONIBLE"
                  ? "Solo se puede recuperar una prenda en buen estado"
                  : undefined
              }
              onClick={onRecuperar}
            >
              Recuperar prenda
            </button>
          )}

          {sinReemplazo && (
            <button type="button" className="btn btn--primary" disabled={procesando} onClick={onBuscarReemplazo}>
              Buscar reemplazo →
            </button>
          )}
        </div>
      )}

      {(situacion === "FALTANTE" || situacion === "DANADA") && (
        <p className="inventario__prenda-aviso">
          Esta prenda requerida está {situacion === "DANADA" ? "dañada" : "faltante"} y no tiene reemplazo. Este disfraz no
          puede alquilarse hasta resolverlo.
        </p>
      )}
    </div>
  );
}

export default function InventarioFisico() {
  const [disfraces, setDisfraces] = useState<DisfrazLista[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetalleInventario | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prendaBuscada, setPrendaBuscada] = useState<PrendaDetalle | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [cargandoCandidatos, setCargandoCandidatos] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Id del disfraz seleccionado "ahora mismo": evita que una respuesta lenta de un
  // disfraz anterior pise el detalle del que se eligió después.
  const seleccionRef = useRef<string | null>(null);

  const mostrarError = useCallback((err: unknown) => {
    setError(mensajeDe(err));
    window.setTimeout(() => setError(null), 5000);
  }, []);

  const cargarLista = useCallback(async () => {
    try {
      const { data } = await api.get<DisfrazLista[]>("/disfraces");
      setDisfraces(data);
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargandoLista(false);
    }
  }, [mostrarError]);

  const cargarDetalle = useCallback(
    async (id: string) => {
      try {
        const { data } = await api.get<DetalleInventario>(`/disfraces/${id}/inventario`);
        if (seleccionRef.current === id) setDetalle(data);
      } catch (err) {
        if (seleccionRef.current === id) mostrarError(err);
      } finally {
        if (seleccionRef.current === id) setCargandoDetalle(false);
      }
    },
    [mostrarError]
  );

  const recargar = useCallback(async () => {
    await cargarLista();
    if (seleccionRef.current) await cargarDetalle(seleccionRef.current);
  }, [cargarLista, cargarDetalle]);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  // Primer disfraz de la lista visible, para que el panel no arranque vacío.
  useEffect(() => {
    if (!seleccionadoId && disfraces.length > 0) setSeleccionadoId(ordenar(disfraces)[0].id);
  }, [disfraces, seleccionadoId]);

  useEffect(() => {
    seleccionRef.current = seleccionadoId;
    setDetalle(null);
    if (!seleccionadoId) return;
    setCargandoDetalle(true);
    cargarDetalle(seleccionadoId);
  }, [seleccionadoId, cargarDetalle]);

  const bloqueado = detalle?.estado === "ALQUILADO";

  const conteos = disfraces.reduce<Record<string, number>>((acc, d) => {
    acc[d.estado] = (acc[d.estado] || 0) + 1;
    return acc;
  }, {});

  const grupos = ordenar(disfraces)
    .filter((d) => d.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .reduce<Record<string, DisfrazLista[]>>((acc, d) => {
      (acc[d.tipoDisfraz] ??= []).push(d);
      return acc;
    }, {});

  async function ejecutar(accion: () => Promise<unknown>) {
    setProcesando(true);
    try {
      await accion();
      await recargar();
    } catch (err) {
      mostrarError(err);
    } finally {
      setProcesando(false);
    }
  }

  const marcarEstadoPrenda = (prendaId: string, estado: "DISPONIBLE" | "FALTANTE") =>
    ejecutar(() => api.patch(`/disfraces/prendas/${prendaId}`, { estado }));

  const marcarListo = (disfrazId: string) =>
    ejecutar(() => api.patch(`/disfraces/${disfrazId}/estado-manual`, { estado: null }));

  const marcarEnReparacion = (disfrazId: string) =>
    ejecutar(() => api.patch(`/disfraces/${disfrazId}/estado-manual`, { estado: "EN_REPARACION" }));

  const devolverPrestamo = (prendaId: string) =>
    ejecutar(() => api.post(`/disfraces/prendas/${prendaId}/devolver-prestamo`));

  async function abrirBuscarReemplazo(prenda: PrendaDetalle) {
    setPrendaBuscada(prenda);
    setCandidatos([]);
    setErrorModal(null);
    setCargandoCandidatos(true);
    try {
      const { data } = await api.get<Candidato[]>(`/disfraces/prendas/${prenda.id}/candidatos`);
      setCandidatos(data);
    } catch (err) {
      setErrorModal(mensajeDe(err, "No se pudieron buscar candidatos"));
    } finally {
      setCargandoCandidatos(false);
    }
  }

  function cerrarModal() {
    setPrendaBuscada(null);
    setCandidatos([]);
    setErrorModal(null);
  }

  async function confirmarPrestamo(donanteId: string) {
    if (!prendaBuscada) return;
    setProcesando(true);
    setErrorModal(null);
    try {
      await api.post(`/disfraces/prendas/${prendaBuscada.id}/prestamo`, { prendaDonanteId: donanteId });
      cerrarModal();
      await recargar();
    } catch (err) {
      setErrorModal(mensajeDe(err));
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div>
      <div className="inventario__resumen">
        {(["DISPONIBLE", "INCOMPLETO", "ALQUILADO", "EN_REPARACION"] as EstadoDisfraz[]).map((e) => (
          <div
            key={e}
            className={`inventario__resumen-pill inventario__resumen-pill--${e.toLowerCase()}`}
          >
            <span className="inventario__resumen-dot" />
            {ETIQUETA_ESTADO[e]} <strong>{conteos[e] || 0}</strong>
          </div>
        ))}

        <div className="inventario__acciones-top">
          <Link to="/admin/almacen" className="btn btn--ghost">
            Almacén
          </Link>
          
          <Link to="/admin/a-medida" className="btn btn--ghost">
            A medida
          </Link>
          
          <Link to="/admin/recetas" className="btn btn--ghost">
            Recetas
          </Link>

          <Link to="/admin/disfraces/nuevo" className="btn btn--primary">
            + Nuevo disfraz
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: "var(--space-4)" }}>
          {error}
        </div>
      )}

      <div className="inventario">
        <aside className="inventario__sidebar">
          <h1 style={{ fontSize: "1.1rem", marginBottom: "var(--space-3)" }}>Inventario Físico</h1>
          <input
            type="text"
            placeholder="Buscar disfraz…"
            aria-label="Buscar disfraz"
            className="inventario__buscar"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          {cargandoLista ? (
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
                      {textoEstado(d, true)}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </aside>

        <section className="inventario__detalle">
          {!seleccionadoId ? (
            <p style={{ color: "var(--text-muted)" }}>Selecciona un disfraz para ver el detalle.</p>
          ) : !detalle ? (
            <p role="status" style={{ color: "var(--text-muted)" }}>
              {cargandoDetalle ? "Cargando…" : "No se pudo cargar el detalle de este disfraz."}
            </p>
          ) : (
            <>
              <div className="inventario__detalle-header">
                <div>
                  <div className="inventario__detalle-titulo">
                    <h2>{detalle.nombre}</h2>
                    <span className={`inventario__estado-badge inventario__estado-badge--${detalle.estado.toLowerCase()}`}>
                      {textoEstado(detalle, false)}
                    </span>
                  </div>
                  <p style={{ color: "var(--text-muted)" }}>
                    S/ {detalle.precioAlquiler}/día · {detalle.tipoDisfraz}
                  </p>
                  {detalle.prestamosSalientes > 0 && (
                    <p className="inventario__prestamo-nota">
                      ⚠ Este disfraz prestó {detalle.prestamosSalientes} pieza(s) a otro disfraz.
                    </p>
                  )}
                </div>

                {!bloqueado && (
                  <div className="inventario__detalle-acciones">
                    {detalle.estado === "SUSPENDIDO" && (
                      <button type="button" className="btn btn--primary" disabled={procesando} onClick={() => marcarListo(detalle.id)}>
                        Marcar como listo
                      </button>
                    )}
                    {detalle.estado === "EN_REPARACION" ? (
                      <button type="button" className="btn btn--ghost" disabled={procesando} onClick={() => marcarListo(detalle.id)}>
                        Salir de reparación
                      </button>
                    ) : (
                      detalle.estado !== "SUSPENDIDO" && (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          disabled={procesando}
                          onClick={() => marcarEnReparacion(detalle.id)}
                        >
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
                {detalle.prendas.map((p) => (
                  <TarjetaPrenda
                    key={p.id}
                    prenda={p}
                    bloqueado={bloqueado}
                    procesando={procesando}
                    onMarcar={(estado) => marcarEstadoPrenda(p.id, estado)}
                    onBuscarReemplazo={() => abrirBuscarReemplazo(p)}
                    onRecuperar={() => devolverPrestamo(p.id)}
                  />
                ))}
              </div>

              {detalle.prestamosRecibidos.length > 0 && (
                <>
                  <h3 className="inventario__seccion-titulo">Piezas de otros disfraces en este disfraz</h3>
                  <div className="inventario__prestamos">
                    {detalle.prestamosRecibidos.map((r) => {
                      const cubre = detalle.prendas.find((p) => p.id === r.reemplazaA);
                      return (
                        <div key={r.id} className="inventario__prestamo">
                          <div>
                            <strong>{r.nombre}</strong>
                            <span className="inventario__prenda-meta">
                              {r.color} · {r.talla} · de {r.origenNombre}
                            </span>
                            <span className="inventario__prenda-meta">
                              {r.apartada
                                ? "Apartada por una reserva: vuelve sola a su lugar"
                                : r.estado !== "DISPONIBLE"
                                ? "No está en buen estado"
                                : r.sobrante
                                ? "Sobrante: ya no hace falta en este disfraz"
                                : cubre
                                ? `Cubre: ${cubre.nombre}`
                                : ""}
                            </span>
                          </div>
                          {r.sobrante && <span className="inventario__pill inventario__pill--info">Sobrante</span>}
                          {!bloqueado && (
                            <button
                              type="button"
                              className="btn btn--ghost"
                              disabled={procesando || !r.puedeDevolverse}
                              title={
                                !r.puedeDevolverse
                                  ? "Solo se puede devolver con ambos disfraces libres y la pieza en buen estado"
                                  : undefined
                              }
                              onClick={() => devolverPrestamo(r.id)}
                            >
                              Devolver a {r.origenNombre}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>

      {prendaBuscada && detalle && (
        <div className="inventario-overlay" onClick={cerrarModal}>
          <div className="inventario-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="inventario-modal__header">
              <div>
                <span className="inventario-modal__eyebrow">Buscando reemplazo para</span>
                <h2>{prendaBuscada.nombre}</h2>
                <p className="inventario-modal__sub">
                  de {detalle.nombre} · {prendaBuscada.color} · talla {prendaBuscada.talla}
                </p>
              </div>
              <button type="button" className="inventario-modal__cerrar" onClick={cerrarModal} aria-label="Cerrar">
                ×
              </button>
            </div>

            <p className="inventario-modal__nota">
              Se ofrecen repuestos del almacén con el mismo nombre y prendas del mismo tipo de disfraces compatibles que no estén
              en lavado. Al confirmar, la prenda se mueve físicamente a <strong>{detalle.nombre}</strong>. Si viene de otro
              disfraz, ese disfraz quedará incompleto hasta que se resuelva; si viene del almacén, no afecta a ninguno.
            </p>

            {errorModal && (
              <div className="alert alert--danger" role="alert" style={{ marginBottom: "var(--space-3)" }}>
                {errorModal}
              </div>
            )}

            {cargandoCandidatos ? (
              <p role="status" className="inventario-modal__contador">Buscando candidatos…</p>
            ) : candidatos.length === 0 ? (
              <p className="inventario-modal__vacio">
                {`No hay repuestos de «${prendaBuscada.nombre}» en el almacén`}
                {detalle.grupoCompatibilidad
                  ? ` ni prendas disponibles de este tipo en disfraces compatibles (grupo «${detalle.grupoCompatibilidad.replace(/-/g, " ")}»).`
                  : "."}
                {" Los disfraces en lavado no prestan piezas. Puedes agregar repuestos desde la pantalla Almacén."}
              </p>
            ) : (
              <p className="inventario-modal__contador">{candidatos.length} candidato(s) encontrado(s):</p>
            )}

            <div className="inventario-modal__lista">
              {candidatos.map((c, i) => {
                const esMejor = i === 0 && !c.disfrazOrigenAlquilado;
                return (
                  <div key={c.id} className={`inventario-candidato ${esMejor ? "inventario-candidato--top" : ""}`}>
                    <div className="inventario-candidato__info">
                      <div className="inventario-candidato__tags">
                        {esMejor && <span className="inventario-pill inventario-pill--top">✓ Mejor opción</span>}
                        {c.mismaFamilia && <span className="inventario-pill inventario-pill--match">Misma familia</span>}
                        {c.mismaTalla && <span className="inventario-pill inventario-pill--match">Misma talla</span>}
                        {c.mismoColor && <span className="inventario-pill inventario-pill--match">Mismo color</span>}
                        {c.esAlmacen && <span className="inventario-pill inventario-pill--match">Almacén</span>}
                        <span className="inventario-pill">{c.calidad}</span>
                      </div>
                      <strong>{c.nombre}</strong>
                      <span className="inventario-candidato__meta">
                        {c.color} · talla {c.talla} · de {c.disfrazOrigenNombre}
                      </span>
                      {c.disfrazOrigenAlquilado ? (
                        <span className="inventario-pill inventario-pill--alerta">
                          ⚠ {c.disfrazOrigenNombre} está alquilado ahora
                        </span>
                      ) : c.esAlmacen ? (
                        <span className="inventario-pill inventario-pill--match">
                          Sale del almacén: no deja ningún disfraz incompleto
                        </span>
                      ) : (
                        <span className="inventario-pill inventario-pill--aviso">
                          ⚠ {c.disfrazOrigenNombre} quedará incompleto
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={c.disfrazOrigenAlquilado || procesando}
                      onClick={() => confirmarPrestamo(c.id)}
                    >
                      Confirmar préstamo
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}