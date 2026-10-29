import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useCarrito } from "../lib/CarritoContext";
import { TALLAS_ROPA, TALLAS_CALZADO, etiquetaTipo } from "../lib/prendas";
import { iconoPorTipo } from "../lib/iconos";
import "./ajuste-talla.css";

interface PiezaInfo {
  id: string;
  nombre: string;
  tipo: string;
  color: string;
  talla: string;
  categoria: string;
}

interface Info {
  disfraz: { id: string; nombre: string; precioDia: number };
  ajustable: boolean;
  motivo: string | null;
  piezas: PiezaInfo[];
  pideTallaRopa: boolean;
  pideTallaCalzado: boolean;
}

interface PiezaPropuesta {
  prendaId: string;
  nombre: string;
  tipo: string;
  color: string;
  talla: string;
  tallaOriginal: string;
  cambia: boolean;
}

interface Faltante {
  prendaId: string;
  nombre: string;
  tipo: string;
  tallaPedida: string;
  motivo: string;
  tallasDisponibles: string[];
}

interface Opcion {
  prendaId: string;
  nombre: string;
  tipo: string;
  categoria: string;
  tallas: string[];
}

interface Propuesta {
  completo: boolean;
  cambios: number;
  piezas: PiezaPropuesta[];
  faltantes: Faltante[];
  opciones: Opcion[];
}

interface ReservaCreada {
  reservaId: string;
  disfrazId: string;
  nombre: string;
  tipoDisfraz: string;
  precioDia: number;
  segundosRestantes: number;
  cambios: number;
  piezas: { prendaId: string; tipo: string; nombre: string; color: string; talla: string }[];
}

function mensajeDe(err: unknown, porDefecto: string): string {
  const data = (err as { response?: { data?: { mensaje?: string; errores?: Record<string, string[] | undefined> } } })
    ?.response?.data;
  return data?.mensaje || (Object.values(data?.errores ?? {})[0] ?? [])[0] || porDefecto;
}

function tallasPedido(ropa: string, calzado: string, ajustes: Record<string, string>) {
  const t: { ropa?: string; calzado?: string; ajustes?: Record<string, string> } = {};
  if (ropa) t.ropa = ropa;
  if (calzado) t.calzado = calzado;
  if (Object.keys(ajustes).length > 0) t.ajustes = ajustes;
  return t;
}

interface Props {
  disfrazId: string;
  nombre: string;
  tipoDisfraz: string;
  onCerrar: () => void;
  onReservado: () => void;
}

export function AjusteTallaModal({ disfrazId, nombre, tipoDisfraz, onCerrar, onReservado }: Props) {
  const { items, agregarItem } = useCarrito();

  const [info, setInfo] = useState<Info | null>(null);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [ropa, setRopa] = useState("");
  const [calzado, setCalzado] = useState("");
  const [ajustes, setAjustes] = useState<Record<string, string>>({});
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [errorPropuesta, setErrorPropuesta] = useState<string | null>(null);
  const [reservando, setReservando] = useState(false);
  const [errorReserva, setErrorReserva] = useState<string | null>(null);

  // Número de la última consulta: una respuesta lenta nunca pisa a la más reciente.
  const solicitud = useRef(0);

  const enCarrito = items.some((i) => i.disfrazFisicoId === disfrazId);

  const necesitaRopa = info?.piezas.some((p) => p.categoria === "ROPA" && !ajustes[p.id]) ?? false;
  const necesitaCalzado = info?.piezas.some((p) => p.categoria === "CALZADO" && !ajustes[p.id]) ?? false;
  const faltaRopa = necesitaRopa && !ropa;
  const faltaCalzado = necesitaCalzado && !calzado;

  // Información del disfraz y tallas guardadas en el perfil (como valor inicial).
  useEffect(() => {
    let activo = true;
    api
      .get<Info>(`/ajuste-talla/${disfrazId}`)
      .then(({ data }) => {
        if (activo) setInfo(data);
      })
      .catch((err) => {
        if (activo) setErrorInfo(mensajeDe(err, "No se pudo cargar el disfraz."));
      });
    api
      .get<{ usuario: { tallaRopa: string | null; tallaCalzado: string | null } }>("/auth/perfil")
      .then(({ data }) => {
        if (!activo) return;
        setRopa((actual) => actual || data.usuario.tallaRopa || "");
        setCalzado((actual) => actual || data.usuario.tallaCalzado || "");
      })
      .catch(() => {
        // Sin tallas guardadas: se eligen a mano.
      });
    return () => {
      activo = false;
    };
  }, [disfrazId]);

  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  // La propuesta se recalcula sola 300 ms después de cada cambio. No reserva nada.
  useEffect(() => {
    if (!info || !info.ajustable || faltaRopa || faltaCalzado) {
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
        const { data } = await api.post<Propuesta>("/ajuste-talla/previsualizar", {
          disfrazId,
          tallas: tallasPedido(ropa, calzado, ajustes),
          excluir: items.filter((i) => i.disfrazFisicoId !== disfrazId).map((i) => i.disfrazFisicoId),
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
  }, [info, disfrazId, ropa, calzado, ajustes, faltaRopa, faltaCalzado, items]);

  function cambiarAjuste(prendaId: string, talla: string) {
    setAjustes((prev) => {
      const siguiente = { ...prev };
      if (talla) siguiente[prendaId] = talla;
      else delete siguiente[prendaId];
      return siguiente;
    });
  }

  async function handleReservar() {
    if (!propuesta?.completo || propuesta.cambios === 0) return;

    setReservando(true);
    setErrorReserva(null);
    try {
      const { data } = await api.post<ReservaCreada>("/ajuste-talla/reservar", {
        disfrazId,
        tallas: tallasPedido(ropa, calzado, ajustes),
        excluir: items.filter((i) => i.disfrazFisicoId !== disfrazId).map((i) => i.disfrazFisicoId),
      });

      agregarItem({
        disfrazFisicoId: data.disfrazId,
        nombre: data.nombre,
        tipoDisfraz: data.tipoDisfraz,
        precioAlquiler: data.precioDia,
        reservaId: data.reservaId,
        venceMs: Date.now() + data.segundosRestantes * 1000,
        piezas: data.piezas.map((p) => ({ etiqueta: etiquetaTipo(p.tipo), nombre: p.nombre, color: p.color, talla: p.talla })),
      });
      onReservado();
      onCerrar();
    } catch (err) {
      setErrorReserva(mensajeDe(err, "No se pudo reservar el disfraz. Intenta de nuevo."));
      setReservando(false);
    }
  }

  function agregarSinCambios() {
    agregarItem({ disfrazFisicoId: disfrazId, nombre, tipoDisfraz, precioAlquiler: info?.disfraz.precioDia ?? 0 });
    onCerrar();
  }

  const opcionesAjustables = propuesta?.opciones ?? [];

  return (
    <div className="ajuste-overlay" onClick={onCerrar}>
      <div
        className="ajuste-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Ajustar ${nombre} a mi talla`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ajuste-modal__cabecera">
          <div>
            <span className="ajuste-modal__etiqueta">Ajustar a mi talla</span>
            <h2>{nombre}</h2>
          </div>
          <button type="button" className="ajuste-modal__cerrar" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </div>

        {errorInfo && (
          <div className="alert alert--danger" role="alert">
            {errorInfo}
          </div>
        )}

        {!info && !errorInfo && <p role="status">Cargando…</p>}

        {info && !info.ajustable && <p className="ajuste-modal__info">{info.motivo ?? "Este disfraz no se puede ajustar ahora."}</p>}

        {info?.ajustable && (
          <>
            <p className="ajuste-modal__texto">
              Elige tus tallas y cambiaremos las piezas que no te queden por otras de tu talla. Es el mismo disfraz, con el mismo precio.
            </p>

            <div className="ajuste-modal__tallas">
              {info.pideTallaRopa && (
                <div className="field">
                  <label htmlFor="aj-ropa">Tu talla de ropa</label>
                  <select id="aj-ropa" value={ropa} onChange={(e) => setRopa(e.target.value)}>
                    <option value="">Elige tu talla…</option>
                    {TALLAS_ROPA.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {info.pideTallaCalzado && (
                <div className="field">
                  <label htmlFor="aj-calzado">Tu talla de calzado</label>
                  <select id="aj-calzado" value={calzado} onChange={(e) => setCalzado(e.target.value)}>
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

            {(faltaRopa || faltaCalzado) && <p className="ajuste-modal__info">Elige tus tallas para ver qué piezas cambiarían.</p>}

            {errorPropuesta && (
              <div className="alert alert--danger" role="alert">
                {errorPropuesta}
              </div>
            )}

            {propuesta && (
              <div className={`ajuste-propuesta ${calculando ? "ajuste-propuesta--calculando" : ""}`} aria-live="polite">
                <ul className="ajuste-piezas">
                  {propuesta.piezas.map((p) => (
                    <li key={p.prendaId} className={p.cambia ? "ajuste-piezas__cambia" : ""}>
                      <span className="ajuste-piezas__icono" aria-hidden="true">
                        {iconoPorTipo(p.tipo)}
                      </span>
                      <div>
                        <strong>{p.nombre}</strong>
                        <span>
                          {p.color} ·{" "}
                          {p.talla === "única"
                            ? "talla única"
                            : p.cambia
                            ? `talla ${p.tallaOriginal} → ${p.talla}`
                            : `talla ${p.talla}`}
                        </span>
                      </div>
                      {p.cambia && <em className="ajuste-piezas__tag">Cambia</em>}
                    </li>
                  ))}
                </ul>

                {propuesta.faltantes.map((f) => (
                  <div key={f.prendaId} className="ajuste-faltante" role="alert">
                    <strong>No se puede ajustar: {f.nombre}.</strong> {f.motivo}
                    {f.tallasDisponibles.length > 0 && (
                      <div className="ajuste-faltante__chips">
                        <span>¿Te sirve otra talla para esta pieza?</span>
                        {f.tallasDisponibles.map((t) => (
                          <button type="button" key={t} className="ajuste-chip" onClick={() => cambiarAjuste(f.prendaId, t)}>
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {propuesta.completo &&
                  (propuesta.cambios > 0 ? (
                    <p className="ajuste-modal__ok">
                      Se cambiarán {propuesta.cambios} pieza{propuesta.cambios === 1 ? "" : "s"} por otras de tu talla.
                    </p>
                  ) : (
                    <p className="ajuste-modal__info">Este disfraz ya viene en las tallas que elegiste.</p>
                  ))}

                {opcionesAjustables.length > 0 && (
                  <details className="ajuste-ajustes">
                    <summary>Ajustar la talla de una pieza (opcional)</summary>
                    {opcionesAjustables.map((o) => {
                      const base = o.categoria === "CALZADO" ? calzado : ropa;
                      return (
                        <div key={o.prendaId} className="ajuste-ajustes__fila">
                          <label htmlFor={`aj-${o.prendaId}`}>{o.nombre}</label>
                          <select
                            id={`aj-${o.prendaId}`}
                            value={ajustes[o.prendaId] ?? ""}
                            onChange={(e) => cambiarAjuste(o.prendaId, e.target.value)}
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

            <div className="ajuste-modal__acciones">
              {propuesta?.completo && propuesta.cambios === 0 ? (
                <button type="button" className="btn btn--primary" disabled={enCarrito} onClick={agregarSinCambios}>
                  {enCarrito ? "En el carrito" : "Agregar al carrito"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!propuesta?.completo || calculando || reservando}
                  onClick={handleReservar}
                >
                  {reservando ? "Reservando…" : "Reservar con mis tallas y agregar al carrito"}
                </button>
              )}
              <button type="button" className="btn btn--ghost" onClick={onCerrar}>
                Cancelar
              </button>
            </div>
            <p className="ajuste-modal__nota">Al reservar, las piezas quedan apartadas 20 minutos para que termines el pago.</p>
          </>
        )}
      </div>
    </div>
  );
}