import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useCarrito } from "../../lib/CarritoContext";
import { useAhora, formatearCuenta } from "../../lib/useAhora";
import { TALLAS_ROPA, TALLAS_CALZADO, etiquetaTipo } from "../../lib/prendas";
import { iconoPorTipo } from "../../lib/iconos";
import "./a-medida.css";

// Debe coincidir con el límite del servidor (reservas.service.ts).
const MAX_RESERVAS = 3;

interface PiezaReceta {
  id: string;
  etiqueta: string;
  tipo: string;
  categoriaTalla: string;
  obligatoria: boolean;
}

interface RecetaPublica {
  id: string;
  nombre: string;
  descripcion: string | null;
  precioDia: number;
  piezas: PiezaReceta[];
  pideTallaRopa: boolean;
  pideTallaCalzado: boolean;
}

interface SugerenciaCatalogo {
  familia: string;
  tipoDisfraz: string;
  imagenUrl: string | null;
  precioDia: number;
  disponibles: number;
}

interface RespuestaBusqueda {
  peticionId: string;
  resultado: "EXACTA" | "PARECIDA" | "SIN_RECETA";
  mensaje: string;
  recetas: RecetaPublica[];
  catalogo: SugerenciaCatalogo[];
}

interface PiezaPropuesta {
  huecoId: string;
  etiqueta: string;
  tipo: string;
  nombre: string;
  color: string;
  talla: string;
  obligatoria: boolean;
}

interface Faltante {
  huecoId: string;
  etiqueta: string;
  tipo: string;
  tallaPedida: string;
  motivo: string;
  tallasDisponibles: string[];
}

interface Omitida {
  huecoId: string;
  etiqueta: string;
  motivo: string;
}

interface OpcionHueco {
  huecoId: string;
  etiqueta: string;
  tipo: string;
  categoria: string;
  tallas: string[];
}

interface Propuesta {
  receta: { id: string; nombre: string; precioDia: number };
  completo: boolean;
  piezas: PiezaPropuesta[];
  omitidas: Omitida[];
  faltantes: Faltante[];
  opciones: OpcionHueco[];
}

interface ReservaCreada {
  reservaId: string;
  disfrazId: string;
  nombre: string;
  tipoDisfraz: string;
  precioDia: number;
  vence: string;
  segundosRestantes: number;
  receta: string;
  piezas: PiezaPropuesta[];
}

interface ReservaServidor {
  reservaId: string;
  tipo: string;
  vence: string;
  segundosRestantes: number;
  receta: string | null;
  disfraz: { id: string; nombre: string; tipoDisfraz: string; precioDia: number };
  piezas: { id: string; nombre: string; tipo: string; color: string; talla: string }[];
}

type ReservaActiva = ReservaServidor & { venceMs: number };

function mensajeDe(err: unknown, porDefecto: string): string {
  const data = (err as { response?: { data?: { mensaje?: string; errores?: Record<string, string[] | undefined> } } })
    ?.response?.data;
  return data?.mensaje || (Object.values(data?.errores ?? {})[0] ?? [])[0] || porDefecto;
}

function estadoHttp(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

const textoTalla = (talla: string) => (talla === "única" ? "talla única" : `talla ${talla}`);

function tallasPedido(ropa: string, calzado: string, ajustes: Record<string, string>) {
  const t: { ropa?: string; calzado?: string; ajustes?: Record<string, string> } = {};
  if (ropa) t.ropa = ropa;
  if (calzado) t.calzado = calzado;
  if (Object.keys(ajustes).length > 0) t.ajustes = ajustes;
  return t;
}

function TarjetaReceta({
  receta,
  elegida,
  onElegir,
}: {
  receta: RecetaPublica;
  elegida: boolean;
  onElegir: (r: RecetaPublica) => void;
}) {
  return (
    <li className={`card amedida__receta ${elegida ? "amedida__receta--elegida" : ""}`}>
      <div className="amedida__receta-cabecera">
        <h3>{receta.nombre}</h3>
        <span className="amedida__precio">S/ {receta.precioDia.toFixed(2)} / día</span>
      </div>
      {receta.descripcion && <p className="amedida__receta-desc">{receta.descripcion}</p>}
      <p className="amedida__receta-piezas">
        {receta.piezas.map((p) => (
          <span key={p.id} className={`amedida__chip-pieza ${p.obligatoria ? "" : "amedida__chip-pieza--opcional"}`}>
            {iconoPorTipo(p.tipo)} {p.etiqueta}
          </span>
        ))}
      </p>
      <button type="button" className="btn btn--primary" onClick={() => onElegir(receta)}>
        {elegida ? "Armando este disfraz…" : "Armar este disfraz"}
      </button>
    </li>
  );
}

export default function DisfrazAMedida() {
  const { items, agregarItem, quitarItem } = useCarrito();

  const [recetasTodas, setRecetasTodas] = useState<RecetaPublica[]>([]);
  const [texto, setTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [busqueda, setBusqueda] = useState<RespuestaBusqueda | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  const [receta, setReceta] = useState<RecetaPublica | null>(null);
  const [ropa, setRopa] = useState("");
  const [calzado, setCalzado] = useState("");
  const [ajustes, setAjustes] = useState<Record<string, string>>({});
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [errorPropuesta, setErrorPropuesta] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const [reservando, setReservando] = useState(false);
  const [errorReserva, setErrorReserva] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const [reservas, setReservas] = useState<ReservaActiva[]>([]);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [errorReservas, setErrorReservas] = useState<string | null>(null);

  const seccionArmado = useRef<HTMLElement | null>(null);
  const solicitud = useRef(0);

  const ahora = useAhora(reservas.length > 0);
  const reservasVisibles = reservas.filter((r) => r.venceMs > ahora);
  const limiteAlcanzado = reservasVisibles.length >= MAX_RESERVAS;

  // Cada tipo de talla se pide solo si algún hueco de ese tipo no tiene un ajuste propio.
  const necesitaRopa = receta?.piezas.some((p) => p.categoriaTalla === "ROPA" && !ajustes[p.id]) ?? false;
  const necesitaCalzado = receta?.piezas.some((p) => p.categoriaTalla === "CALZADO" && !ajustes[p.id]) ?? false;
  const faltaRopa = necesitaRopa && !ropa;
  const faltaCalzado = necesitaCalzado && !calzado;

  const cargarReservas = useCallback(async () => {
    try {
      const { data } = await api.get<ReservaServidor[]>("/a-medida/reservas");
      const base = Date.now();
      setReservas(
        data.filter((r) => r.tipo === "A_MEDIDA").map((r) => ({ ...r, venceMs: base + r.segundosRestantes * 1000 }))
      );
      setErrorReservas(null);
    } catch (err) {
      setErrorReservas(mensajeDe(err, "No se pudieron cargar tus reservas."));
    }
  }, []);

  useEffect(() => {
    api
      .get<RecetaPublica[]>("/a-medida/recetas")
      .then(({ data }) => setRecetasTodas(data))
      .catch(() => {
        // Sin atajos: el buscador funciona igual.
      });
    cargarReservas();
  }, [cargarReservas]);

  // Al elegir una receta, la pantalla baja hasta el armado (sin animación si el usuario la desactivó).
  useEffect(() => {
    if (!receta) return;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    seccionArmado.current?.scrollIntoView({ behavior: reducir ? "auto" : "smooth", block: "start" });
  }, [receta]);

  // La propuesta se recalcula sola 300 ms después de cada cambio. No reserva nada.
  useEffect(() => {
    if (!receta || faltaRopa || faltaCalzado) {
      solicitud.current++;
      setPropuesta(null);
      setErrorPropuesta(null);
      setCalculando(false);
      return;
    }

    const id = ++solicitud.current;
    setCalculando(true);

    const temporizador = window.setTimeout(async () => {
      try {
        const { data } = await api.post<Propuesta>("/a-medida/previsualizar", {
          recetaId: receta.id,
          tallas: tallasPedido(ropa, calzado, ajustes),
        });
        if (id !== solicitud.current) return;
        setPropuesta(data);
        setErrorPropuesta(null);
      } catch (err) {
        if (id !== solicitud.current) return;
        setPropuesta(null);
        setErrorPropuesta(mensajeDe(err, "No se pudo calcular la propuesta."));
      } finally {
        if (id === solicitud.current) setCalculando(false);
      }
    }, 300);

    return () => window.clearTimeout(temporizador);
  }, [receta, ropa, calzado, ajustes, faltaRopa, faltaCalzado, version]);

  function elegirReceta(r: RecetaPublica) {
    setReceta(r);
    setAjustes({});
    setPropuesta(null);
    setErrorPropuesta(null);
    setErrorReserva(null);
    setExito(null);
  }

  function cancelarArmado() {
    setReceta(null);
    setAjustes({});
    setPropuesta(null);
    setErrorPropuesta(null);
    setErrorReserva(null);
  }

  async function handleBuscar(e: FormEvent) {
    e.preventDefault();
    const limpio = texto.trim();
    if (limpio.length < 2) return;

    setBuscando(true);
    setErrorBusqueda(null);
    setExito(null);
    try {
      const { data } = await api.post<RespuestaBusqueda>("/a-medida/buscar", { texto: limpio });
      setBusqueda(data);
      cancelarArmado();
      // Una sola coincidencia exacta: se pasa directo al armado.
      if (data.resultado === "EXACTA" && data.recetas.length === 1) elegirReceta(data.recetas[0]);
    } catch (err) {
      setBusqueda(null);
      setErrorBusqueda(mensajeDe(err, "No se pudo buscar. Intenta de nuevo."));
    } finally {
      setBuscando(false);
    }
  }

  function cambiarAjuste(huecoId: string, talla: string) {
    setAjustes((prev) => {
      const siguiente = { ...prev };
      if (talla) siguiente[huecoId] = talla;
      else delete siguiente[huecoId];
      return siguiente;
    });
  }

  async function handleReservar() {
    if (!receta || !propuesta?.completo) return;

    setReservando(true);
    setErrorReserva(null);
    setExito(null);
    try {
      const { data } = await api.post<ReservaCreada>("/a-medida/reservar", {
        recetaId: receta.id,
        tallas: tallasPedido(ropa, calzado, ajustes),
        peticion: texto.trim().slice(0, 80) || undefined,
      });

      agregarItem({
        disfrazFisicoId: data.disfrazId,
        nombre: data.nombre,
        tipoDisfraz: data.tipoDisfraz,
        precioAlquiler: data.precioDia,
        reservaId: data.reservaId,
        venceMs: Date.now() + data.segundosRestantes * 1000,
        piezas: data.piezas.map((p) => ({ etiqueta: p.etiqueta, nombre: p.nombre, color: p.color, talla: p.talla })),
      });

      setExito(
        `«${data.receta}» quedó reservado a tu nombre. Tienes ${Math.floor(data.segundosRestantes / 60)} minutos para pagarlo desde el carrito.`
      );
      cancelarArmado();
      await cargarReservas();
    } catch (err) {
      setErrorReserva(mensajeDe(err, "No se pudo reservar el disfraz. Intenta de nuevo."));
      setVersion((v) => v + 1); // vuelve a calcular la propuesta: el stock pudo cambiar
    } finally {
      setReservando(false);
    }
  }

  function agregarReservaAlCarrito(r: ReservaActiva) {
    agregarItem({
      disfrazFisicoId: r.disfraz.id,
      nombre: r.disfraz.nombre,
      tipoDisfraz: r.disfraz.tipoDisfraz,
      precioAlquiler: r.disfraz.precioDia,
      reservaId: r.reservaId,
      venceMs: r.venceMs,
      piezas: r.piezas.map((p) => ({ etiqueta: etiquetaTipo(p.tipo), nombre: p.nombre, color: p.color, talla: p.talla })),
    });
  }

  async function cancelarReserva(r: ReservaActiva) {
    setCancelandoId(r.reservaId);
    setErrorReservas(null);
    try {
      await api.delete(`/a-medida/reservas/${r.reservaId}`);
    } catch (err) {
      if (estadoHttp(err) !== 404) {
        // 404 = ya no existía: da igual, igual se quita de la lista.
        setErrorReservas(mensajeDe(err, "No se pudo cancelar la reserva."));
        setCancelandoId(null);
        return;
      }
    }
    quitarItem(r.disfraz.id);
    setCancelandoId(null);
    setVersion((v) => v + 1);
    await cargarReservas();
  }

  const opcionesAjustables = propuesta?.opciones.filter((o) => o.categoria !== "UNICA") ?? [];
  const sugerencias = busqueda ? busqueda.recetas : recetasTodas;

  return (
    <div className="amedida">
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Disfraz a medida</h1>
      <p className="amedida__subtitulo">
        ¿No encuentras el disfraz que buscas en el catálogo? Dinos de qué lo quieres y lo armamos con piezas de tu talla.
      </p>

      {/* ---------- Búsqueda ---------- */}
      <form className="card amedida__buscador" onSubmit={handleBuscar}>
        <div className="field">
          <label htmlFor="am-texto">¿Qué disfraz quieres?</label>
          <div className="amedida__buscador-fila">
            <input
              id="am-texto"
              type="text"
              minLength={2}
              maxLength={80}
              required
              placeholder="Ej. bombero, doctor, chef…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button type="submit" className="btn btn--primary" disabled={buscando || texto.trim().length < 2}>
              {buscando ? "Buscando…" : "Buscar"}
            </button>
          </div>
        </div>

        {!busqueda && recetasTodas.length > 0 && (
          <p className="amedida__atajos">
            <span>O elige uno:</span>
            {recetasTodas.map((r) => (
              <button type="button" key={r.id} className="amedida__atajo" onClick={() => elegirReceta(r)}>
                {r.nombre}
              </button>
            ))}
          </p>
        )}
      </form>

      {errorBusqueda && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: "var(--space-4)" }}>
          {errorBusqueda}
        </div>
      )}

      {exito && (
        <p className="amedida__exito" role="status">
          {exito}
        </p>
      )}

      {busqueda && (
        <section className="amedida__resultado" aria-label="Resultado de la búsqueda">
          <p className="amedida__mensaje" role="status">
            {busqueda.mensaje}
          </p>

          {busqueda.catalogo.length > 0 && (
            <div className="amedida__catalogo">
              <h2>Ya tenemos en el catálogo</h2>
              <ul>
                {busqueda.catalogo.map((c) => (
                  <li key={c.familia} className="card amedida__catalogo-item">
                    {c.imagenUrl && <img src={c.imagenUrl} alt="" loading="lazy" width={64} height={64} />}
                    <div>
                      <strong>{c.familia}</strong>
                      <span>
                        S/ {c.precioDia.toFixed(2)} / día · {c.disponibles} disponible{c.disponibles > 1 ? "s" : ""}
                      </span>
                    </div>
                    <Link to="/catalogo" className="btn btn--ghost">
                      Ver en el catálogo
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sugerencias.length > 0 && (
            <ul className="amedida__recetas">
              {sugerencias.map((r) => (
                <TarjetaReceta key={r.id} receta={r} elegida={receta?.id === r.id} onElegir={elegirReceta} />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ---------- Armado ---------- */}
      {receta && (
        <section ref={seccionArmado} className="card amedida__armado" aria-label={`Armar disfraz de ${receta.nombre}`}>
          <div className="amedida__armado-cabecera">
            <div>
              <h2>Arma tu disfraz de {receta.nombre}</h2>
              <span className="amedida__precio">S/ {receta.precioDia.toFixed(2)} por día</span>
            </div>
            <button type="button" className="btn btn--ghost" onClick={cancelarArmado}>
              Cambiar de disfraz
            </button>
          </div>

          <div className="amedida__tallas">
            {receta.pideTallaRopa && (
              <div className="field">
                <label htmlFor="am-ropa">Tu talla de ropa</label>
                <select id="am-ropa" value={ropa} onChange={(e) => setRopa(e.target.value)}>
                  <option value="">Elige tu talla…</option>
                  {TALLAS_ROPA.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {receta.pideTallaCalzado && (
              <div className="field">
                <label htmlFor="am-calzado">Tu talla de calzado</label>
                <select id="am-calzado" value={calzado} onChange={(e) => setCalzado(e.target.value)}>
                  <option value="">Elige tu talla…</option>
                  {TALLAS_CALZADO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {(faltaRopa || faltaCalzado) && (
            <p className="amedida__info">Elige tus tallas para ver qué piezas te corresponden.</p>
          )}

          {errorPropuesta && (
            <div className="alert alert--danger" role="alert">
              {errorPropuesta}
            </div>
          )}

          {propuesta && (
            <div className={`amedida__propuesta ${calculando ? "amedida__propuesta--calculando" : ""}`} aria-live="polite">
              <h3>Así quedaría tu disfraz</h3>

              {propuesta.piezas.length > 0 && (
                <ul className="amedida__piezas">
                  {propuesta.piezas.map((p) => (
                    <li key={p.huecoId}>
                      <span className="amedida__pieza-icono" aria-hidden="true">
                        {iconoPorTipo(p.tipo)}
                      </span>
                      <div>
                        <strong>{p.etiqueta}</strong>
                        <span>
                          {p.nombre} · {p.color} · {textoTalla(p.talla)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {propuesta.faltantes.map((f) => (
                <div key={f.huecoId} className="amedida__faltante" role="alert">
                  <strong>Falta: {f.etiqueta}.</strong> {f.motivo}
                  {f.tallasDisponibles.length > 0 ? (
                    <div className="amedida__chips">
                      <span>¿Te sirve otra talla para esta pieza?</span>
                      {f.tallasDisponibles.map((t) => (
                        <button type="button" key={t} className="amedida__chip" onClick={() => cambiarAjuste(f.huecoId, t)}>
                          {t}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="amedida__sin-stock"> Por ahora no hay unidades de esta pieza.</span>
                  )}
                </div>
              ))}

              {propuesta.omitidas.length > 0 && (
                <p className="amedida__omitidas">
                  Sin {propuesta.omitidas.map((o) => o.etiqueta.toLowerCase()).join(", ")} por ahora (son opcionales).
                </p>
              )}

              {opcionesAjustables.length > 0 && (
                <details className="amedida__ajustes">
                  <summary>Ajustar la talla de una pieza (opcional)</summary>
                  <p className="amedida__ayuda">
                    Útil si usas una talla distinta en alguna prenda. Solo se ofrecen tallas que existen.
                  </p>
                  {opcionesAjustables.map((o) => {
                    const base = o.categoria === "CALZADO" ? calzado : ropa;
                    return (
                      <div key={o.huecoId} className="amedida__ajuste">
                        <label htmlFor={`am-aj-${o.huecoId}`}>{o.etiqueta}</label>
                        <select
                          id={`am-aj-${o.huecoId}`}
                          value={ajustes[o.huecoId] ?? ""}
                          onChange={(e) => cambiarAjuste(o.huecoId, e.target.value)}
                        >
                          <option value="">{base ? `Mi talla (${base})` : "Mi talla"}</option>
                          {o.tallas.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </details>
              )}
            </div>
          )}

          {errorReserva && (
            <div className="alert alert--danger" role="alert">
              {errorReserva}
            </div>
          )}

          <div className="amedida__reservar">
            <button
              type="button"
              className="btn btn--primary"
              disabled={!propuesta?.completo || calculando || reservando || limiteAlcanzado}
              onClick={handleReservar}
            >
              {reservando ? "Reservando…" : "Reservar y agregar al carrito"}
            </button>
            <p className="amedida__ayuda">
              {limiteAlcanzado
                ? `Ya tienes ${MAX_RESERVAS} disfraces reservados sin pagar. Paga o cancela alguno para armar otro.`
                : "Al reservar, las piezas quedan apartadas 20 minutos para que termines el pago. El total, con descuentos, lo verás en el carrito al elegir tus fechas."}
            </p>
          </div>
        </section>
      )}

      {/* ---------- Reservas sin pagar ---------- */}
      {errorReservas && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: "var(--space-4)" }}>
          {errorReservas}
        </div>
      )}

      {reservasVisibles.length > 0 && (
        <section className="amedida__reservas" aria-label="Tus reservas sin pagar">
          <h2>
            Tus reservas sin pagar ({reservasVisibles.length} de {MAX_RESERVAS})
          </h2>
          <ul>
            {reservasVisibles.map((r) => {
              const enCarrito = items.some((i) => i.disfrazFisicoId === r.disfraz.id);
              const restante = r.venceMs - ahora;
              return (
                <li key={r.reservaId} className="card amedida__reserva">
                  <div className="amedida__reserva-cabecera">
                    <div>
                      <strong>{r.disfraz.nombre}</strong>
                      <span>S/ {r.disfraz.precioDia.toFixed(2)} / día</span>
                    </div>
                    <span
                      className={`amedida__cuenta ${restante < 120_000 ? "amedida__cuenta--urgente" : ""}`}
                      role="timer"
                    >
                      {formatearCuenta(restante)}
                    </span>
                  </div>

                  <ul className="amedida__reserva-piezas">
                    {r.piezas.map((p) => (
                      <li key={p.id}>
                        {p.nombre} · {p.color} · {textoTalla(p.talla)}
                      </li>
                    ))}
                  </ul>

                  <div className="amedida__reserva-acciones">
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={enCarrito}
                      onClick={() => agregarReservaAlCarrito(r)}
                    >
                      {enCarrito ? "En el carrito" : "Agregar al carrito"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      disabled={cancelandoId === r.reservaId}
                      onClick={() => cancelarReserva(r)}
                    >
                      {cancelandoId === r.reservaId ? "Cancelando…" : "Cancelar reserva"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}