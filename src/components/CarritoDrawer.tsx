import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useCarrito } from "../lib/CarritoContext";
import type { ItemCarrito } from "../lib/CarritoContext";
import { useAhora, formatearCuenta } from "../lib/useAhora";
import { api } from "../lib/api";
import "./carrito-drawer.css";

interface PromocionAplicada {
  id: string;
  nombre: string;
  porcentaje: number;
  codigo: string | null;
}

interface LineaCotizacion {
  disfrazId: string;
  nombre: string;
  precioDia: number;
  dias: number;
  subtotal: number;
  descuento: number;
  total: number;
  promocion: PromocionAplicada | null;
}

interface EstadoCodigo {
  codigo: string;
  valido: boolean;
  aplicado: boolean;
  mensaje: string;
}

interface Cotizacion {
  dias: number;
  lineas: LineaCotizacion[];
  subtotal: number;
  descuento: number;
  totalAlquiler: number;
  garantia: number;
  totalAPagar: number;
  detalleDescuento: string | null;
  codigo: EstadoCodigo | null;
}

function soles(n: number): string {
  return `S/ ${n.toFixed(2)}`;
}

function mensajeDe(err: unknown, porDefecto: string): string {
  const data = (err as { response?: { data?: { mensaje?: string; errores?: Record<string, string[] | undefined> } } })
    ?.response?.data;
  return data?.mensaje || (Object.values(data?.errores ?? {})[0] ?? [])[0] || porDefecto;
}

// Fecha de hoy en la zona horaria del navegador (toISOString usaría UTC y, de noche en
// Lima, ya mostraría «mañana»).
function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// El servidor evalúa el día de la semana de la fecha de inicio en UTC: se muestra igual.
function nombreDia(fecha: string): string {
  return new Date(`${fecha}T00:00:00Z`).toLocaleDateString("es-PE", { weekday: "long", timeZone: "UTC" });
}

export function CarritoDrawer() {
  const { items, quitarItem, totalPorDia, abierto, cerrarCarrito, aviso, descartarAviso } = useCarrito();

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [evento, setEvento] = useState("");
  const [codigoInput, setCodigoInput] = useState("");
  const [codigoAplicado, setCodigoAplicado] = useState("");

  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [cotizando, setCotizando] = useState(false);
  const [errorCotizacion, setErrorCotizacion] = useState<string | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [quitandoId, setQuitandoId] = useState<string | null>(null);

  // Número de la última consulta de precio: una respuesta lenta de una consulta anterior
  // nunca pisa a la más reciente.
  const solicitud = useRef(0);

  const rangoValido = !!fechaInicio && !!fechaFin && fechaFin >= fechaInicio;
  const hayReservas = items.some((i) => i.venceMs != null);
  const ahora = useAhora(abierto && hayReservas);

  useEffect(() => {
    if (!abierto) return;

    if (items.length === 0 || !rangoValido) {
      solicitud.current++;
      setCotizacion(null);
      setErrorCotizacion(null);
      setCotizando(false);
      return;
    }

    const id = ++solicitud.current;
    setCotizando(true);

    const temporizador = window.setTimeout(async () => {
      try {
        const { data } = await api.post<Cotizacion>("/pagos/cotizar", {
          disfraces: items.map((i) => i.disfrazFisicoId),
          fechaInicio,
          fechaFin,
          codigo: codigoAplicado || undefined,
        });
        if (id !== solicitud.current) return;
        setCotizacion(data);
        setErrorCotizacion(null);
      } catch (err) {
        if (id !== solicitud.current) return;
        setCotizacion(null);
        setErrorCotizacion(mensajeDe(err, "No se pudo calcular el precio."));
      } finally {
        if (id === solicitud.current) setCotizando(false);
      }
    }, 300);

    return () => window.clearTimeout(temporizador);
  }, [abierto, items, fechaInicio, fechaFin, rangoValido, codigoAplicado]);

  const lineaPorId = useMemo(
    () => new Map(cotizacion?.lineas.map((l) => [l.disfrazId, l] as const) ?? []),
    [cotizacion]
  );

  if (!abierto) return null;

  const codigoInvalido = !!cotizacion?.codigo && !cotizacion.codigo.valido;
  const puedePagar = !!cotizacion && !cotizando && !codigoInvalido && !guardando && !quitandoId;

  function cambiarInicio(valor: string) {
    setFechaInicio(valor);
    // Si la fecha de fin quedó antes del nuevo inicio, se vuelve a pedir.
    if (fechaFin && valor && fechaFin < valor) setFechaFin("");
  }

  function aplicarCodigo() {
    const limpio = codigoInput.trim().toUpperCase();
    if (!limpio) return;
    setCodigoAplicado(limpio);
    setCodigoInput("");
  }

  function quitarCodigo() {
    setCodigoAplicado("");
  }

  function alPulsarTecla(e: KeyboardEvent<HTMLInputElement>) {
    // Enter dentro del campo de código aplica el código; no debe disparar el pago.
    if (e.key === "Enter") {
      e.preventDefault();
      aplicarCodigo();
    }
  }

  // Quitar un disfraz a medida cancela su reserva en el servidor: así las piezas vuelven
  // al almacén y la reserva deja de contar para el límite de 3 sin pagar.
  async function quitar(item: ItemCarrito) {
    setErrorPago(null);
    if (item.reservaId) {
      setQuitandoId(item.disfrazFisicoId);
      try {
        await api.delete(`/a-medida/reservas/${item.reservaId}`);
      } catch (err) {
        const estado = (err as { response?: { status?: number } })?.response?.status;
        if (estado !== 404) {
          // 404 = la reserva ya no existía (venció o se canceló): da igual, se quita igual.
          setErrorPago(mensajeDe(err, "No se pudo cancelar la reserva. Intenta de nuevo."));
          setQuitandoId(null);
          return;
        }
      }
      setQuitandoId(null);
    }
    quitarItem(item.disfrazFisicoId);
  }

  async function handlePagar(e: FormEvent) {
    e.preventDefault();
    if (!puedePagar) return;

    if (items.some((i) => i.venceMs != null && i.venceMs <= Date.now())) {
      setErrorPago("La reserva de un disfraz a medida acaba de vencer. Quítalo del carrito y vuelve a armarlo.");
      return;
    }

    setErrorPago(null);
    setGuardando(true);
    try {
      const { data } = await api.post<{ url: string }>("/pagos/crear-sesion", {
        fechaInicio,
        fechaFin,
        evento,
        disfraces: items.map((i) => i.disfrazFisicoId),
        codigo: codigoAplicado || undefined,
      });
      // Redirige la misma pestaña (no abre una nueva): Stripe devuelve al cliente a esta app.
      window.location.href = data.url;
    } catch (err) {
      setErrorPago(mensajeDe(err, "No se pudo iniciar el pago"));
      setGuardando(false);
    }
  }

  function handleCerrar() {
    setErrorPago(null);
    cerrarCarrito();
  }

  const estadoCodigo = cotizacion?.codigo ?? null;
  const claseMensajeCodigo = !estadoCodigo
    ? ""
    : !estadoCodigo.valido
    ? "carrito-drawer__codigo-msg--error"
    : estadoCodigo.aplicado
    ? "carrito-drawer__codigo-msg--ok"
    : "carrito-drawer__codigo-msg--info";

  return (
    <div className="carrito-overlay" onClick={handleCerrar}>
      <aside className="carrito-drawer" role="dialog" aria-modal="true" aria-label="Tu carrito" onClick={(e) => e.stopPropagation()}>
        <div className="carrito-drawer__header">
          <h2>Tu carrito</h2>
          <button type="button" className="carrito-drawer__cerrar" onClick={handleCerrar} aria-label="Cerrar carrito">
            ×
          </button>
        </div>

        {aviso && (
          <div className="carrito-drawer__aviso" role="status">
            <span>{aviso}</span>
            <button type="button" onClick={descartarAviso} aria-label="Cerrar aviso">
              ×
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <p className="carrito-drawer__vacio">Tu carrito está vacío.</p>
        ) : (
          <form onSubmit={handlePagar}>
            {errorPago && (
              <div className="alert alert--danger" role="alert">
                {errorPago}
              </div>
            )}

            <ul className="carrito-drawer__items">
              {items.map((item) => {
                const linea = lineaPorId.get(item.disfrazFisicoId);
                const restante = item.venceMs != null ? item.venceMs - ahora : null;
                return (
                  <li key={item.disfrazFisicoId} className="carrito-drawer__item">
                    <div className="carrito-drawer__item-header">
                      <div>
                        <strong>{item.nombre}</strong>
                        <span className="carrito-drawer__item-tipo">{item.tipoDisfraz}</span>
                      </div>
                      <button
                        type="button"
                        className="carrito-drawer__quitar"
                        disabled={quitandoId === item.disfrazFisicoId}
                        onClick={() => quitar(item)}
                        aria-label={
                          item.reservaId
                            ? `Quitar ${item.nombre} del carrito y cancelar su reserva`
                            : `Quitar ${item.nombre} del carrito`
                        }
                      >
                        ×
                      </button>
                    </div>

                    {restante != null && (
                      <div className="carrito-drawer__medida">
                        <span className="carrito-drawer__medida-etiqueta">Reservado a tu nombre</span>
                        <span
                          className={`carrito-drawer__cuenta ${restante < 120_000 ? "carrito-drawer__cuenta--urgente" : ""}`}
                          role="timer"
                        >
                          {formatearCuenta(restante)}
                        </span>
                      </div>
                    )}

                    <div className="carrito-drawer__item-linea">
                      <span className="carrito-drawer__item-precio">S/{item.precioAlquiler}/día</span>
                      {linea && (
                        <span className="carrito-drawer__item-total">
                          {linea.descuento > 0 && <span className="carrito-drawer__tachado">{soles(linea.subtotal)}</span>}
                          {soles(linea.total)}
                        </span>
                      )}
                    </div>

                    {linea?.promocion && (
                      <span className="carrito-drawer__oferta">
                        −{linea.promocion.porcentaje}% · {linea.promocion.nombre}
                      </span>
                    )}

                    {item.piezas && item.piezas.length > 0 && (
                      <details className="carrito-drawer__piezas">
                        <summary>Ver las {item.piezas.length} piezas</summary>
                        <ul>
                          {item.piezas.map((p, i) => (
                            <li key={`${p.etiqueta}-${i}`}>
                              <strong>{p.etiqueta}:</strong> {p.nombre} · {p.color} ·{" "}
                              {p.talla === "única" ? "talla única" : `talla ${p.talla}`}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="field">
              <label htmlFor="fecha-inicio">Fecha inicio</label>
              <input
                id="fecha-inicio"
                type="date"
                required
                min={hoyLocal()}
                value={fechaInicio}
                onChange={(e) => cambiarInicio(e.target.value)}
              />
              {fechaInicio && <span className="carrito-drawer__hint">Tu alquiler empieza el {nombreDia(fechaInicio)}.</span>}
            </div>
            <div className="field">
              <label htmlFor="fecha-fin">Fecha fin</label>
              <input
                id="fecha-fin"
                type="date"
                required
                min={fechaInicio || hoyLocal()}
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="evento">Ocasión / evento</label>
              <input
                id="evento"
                type="text"
                maxLength={120}
                placeholder="Ej: fiesta de Halloween…"
                value={evento}
                onChange={(e) => setEvento(e.target.value)}
              />
            </div>

            <div className="carrito-drawer__codigo">
              <label htmlFor="codigo-promo">Código de descuento</label>
              {codigoAplicado ? (
                <div className="carrito-drawer__codigo-aplicado">
                  <span className="carrito-drawer__codigo-chip">{codigoAplicado}</span>
                  <button type="button" className="btn btn--ghost" onClick={quitarCodigo}>
                    Quitar
                  </button>
                </div>
              ) : (
                <div className="carrito-drawer__codigo-fila">
                  <input
                    id="codigo-promo"
                    type="text"
                    maxLength={40}
                    autoComplete="off"
                    placeholder="Ej. BIENVENIDA10"
                    value={codigoInput}
                    onChange={(e) => setCodigoInput(e.target.value)}
                    onKeyDown={alPulsarTecla}
                  />
                  <button type="button" className="btn btn--ghost" disabled={!codigoInput.trim()} onClick={aplicarCodigo}>
                    Aplicar
                  </button>
                </div>
              )}

              {estadoCodigo && (
                <p className={`carrito-drawer__codigo-msg ${claseMensajeCodigo}`} role="status">
                  {estadoCodigo.mensaje}
                </p>
              )}
              {codigoAplicado && !estadoCodigo && !cotizando && !errorCotizacion && (
                <p className="carrito-drawer__codigo-msg carrito-drawer__codigo-msg--info" role="status">
                  Elige las fechas para validar el código.
                </p>
              )}
            </div>

            {errorCotizacion && (
              <div className="alert alert--danger" role="alert">
                {errorCotizacion}
              </div>
            )}

            <div
              className={`carrito-drawer__resumen ${cotizando ? "carrito-drawer__resumen--calculando" : ""}`}
              aria-live="polite"
            >
              {cotizacion ? (
                <>
                  <div className="carrito-drawer__resumen-linea">
                    <span>
                      Subtotal ({cotizacion.dias} día{cotizacion.dias > 1 ? "s" : ""})
                    </span>
                    <span>{soles(cotizacion.subtotal)}</span>
                  </div>
                  {cotizacion.descuento > 0 && (
                    <div className="carrito-drawer__resumen-linea carrito-drawer__resumen-linea--descuento">
                      <span>Descuento</span>
                      <span>−{soles(cotizacion.descuento)}</span>
                    </div>
                  )}
                  {cotizacion.detalleDescuento && (
                    <p className="carrito-drawer__detalle-descuento">{cotizacion.detalleDescuento}</p>
                  )}
                  <div className="carrito-drawer__resumen-linea">
                    <span>Garantía (25%, reembolsable)</span>
                    <span>{soles(cotizacion.garantia)}</span>
                  </div>
                  <div className="carrito-drawer__resumen-linea carrito-drawer__resumen-linea--total">
                    <span>Total a pagar</span>
                    <span>{soles(cotizacion.totalAPagar)}</span>
                  </div>
                  <p className="carrito-drawer__resumen-nota">
                    La garantía se devuelve completa si el disfraz vuelve en buen estado.
                  </p>
                </>
              ) : (
                <>
                  <div className="carrito-drawer__resumen-linea">
                    <span>Precio por día (referencia)</span>
                    <span>{soles(totalPorDia)}</span>
                  </div>
                  <p className="carrito-drawer__resumen-nota">
                    {cotizando
                      ? "Calculando…"
                      : "Elige las fechas para ver el total exacto, con descuentos y garantía."}
                  </p>
                </>
              )}
            </div>

            {hayReservas && (
              <p className="carrito-drawer__resumen-nota carrito-drawer__nota-reserva">
                Las piezas de tu disfraz a medida están apartadas solo por el tiempo que ves arriba. Si no terminas el pago a
                tiempo, vuelven al almacén.
              </p>
            )}

            <button type="submit" className="btn btn--primary" style={{ width: "100%" }} disabled={!puedePagar}>
              {guardando
                ? "Redirigiendo…"
                : cotizacion
                ? `Pagar · ${soles(cotizacion.totalAPagar)}`
                : "Elige las fechas para pagar"}
            </button>
            {codigoInvalido && (
              <p className="carrito-drawer__resumen-nota" style={{ marginTop: "var(--space-2)" }}>
                Quita o corrige el código de descuento para continuar.
              </p>
            )}
          </form>
        )}
      </aside>
    </div>
  );
}