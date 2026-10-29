import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import "./devoluciones.css";

type EstadoPieza = "BUEN_ESTADO" | "DANADA" | "FALTANTE";
type EstadoGarantia = "PENDIENTE" | "DEVUELTA" | "RETENIDA";
type Filtro = "PENDIENTE" | "RESUELTAS" | "TODAS";

interface PiezaDevuelta {
  id: string;
  prendaId: string;
  estadoPrenda: EstadoPieza;
  estadoAdmin: EstadoPieza | null;
  observacion: string | null;
  prenda: { id: string; nombre: string; tipo: string; color: string; talla: string };
}

interface Devolucion {
  id: string;
  fechaDevolucion: string;
  observaciones: string | null;
  garantiaEstado: EstadoGarantia;
  garantiaMonto: string | null;
  garantiaMotivo: string | null;
  garantiaReembolsoId: string | null;
  garantiaResueltaEn: string | null;
  prendas: PiezaDevuelta[];
  resueltaPor: { nombre: string } | null;
  alquiler: {
    id: string;
    evento: string | null;
    montoGarantia: string;
    stripeSessionId: string | null;
    usuario: { nombre: string; email: string };
    disfraces: { disfrazFisico: { nombre: string } }[];
  };
}

const ETIQUETA_PIEZA: Record<EstadoPieza, string> = {
  BUEN_ESTADO: "Buen estado",
  DANADA: "Dañada",
  FALTANTE: "Faltante",
};

const ETIQUETA_GARANTIA: Record<EstadoGarantia, string> = {
  PENDIENTE: "Por resolver",
  DEVUELTA: "Devuelta",
  RETENIDA: "Retenida",
};

function mensajeDe(err: unknown, porDefecto = "No se pudo completar la acción."): string {
  const data = (err as { response?: { data?: { mensaje?: string; errores?: Record<string, string[] | undefined> } } })
    ?.response?.data;
  return data?.mensaje || (Object.values(data?.errores ?? {})[0] ?? [])[0] || porDefecto;
}

const soles = (n: number | string) => `S/ ${Number(n).toFixed(2)}`;
const estadoFinal = (p: PiezaDevuelta): EstadoPieza => p.estadoAdmin ?? p.estadoPrenda;

interface TarjetaProps {
  d: Devolucion;
  onCambio: (d: Devolucion) => void;
  onAviso: (mensaje: string) => void;
}

function TarjetaDevolucion({ d, onCambio, onAviso }: TarjetaProps) {
  const pendiente = d.garantiaEstado === "PENDIENTE";
  const garantia = Number(d.alquiler.montoGarantia);
  const problemas = d.prendas.filter((p) => estadoFinal(p) !== "BUEN_ESTADO");

  const [notas, setNotas] = useState<Record<string, string>>(() =>
    Object.fromEntries(d.prendas.map((p) => [p.prendaId, p.observacion ?? ""]))
  );
  const [guardando, setGuardando] = useState<string | null>(null);
  const [accion, setAccion] = useState<"DEVOLVER" | "RETENER" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function guardarPieza(p: PiezaDevuelta, estado: EstadoPieza, nota: string) {
    setGuardando(p.prendaId);
    setError(null);
    try {
      const { data } = await api.patch<Devolucion>(`/devoluciones/${d.id}/prendas/${p.prendaId}`, {
        estado,
        observacion: nota,
      });
      onCambio(data);
      setNotas((prev) => ({ ...prev, [p.prendaId]: nota.trim() }));
    } catch (err) {
      setError(mensajeDe(err));
      setNotas((prev) => ({ ...prev, [p.prendaId]: p.observacion ?? "" }));
    } finally {
      setGuardando(null);
    }
  }

  function abrirRetener() {
    setAccion("RETENER");
    setMotivo((actual) => {
      if (actual || problemas.length === 0) return actual;
      return `Prendas con problemas: ${problemas.map((p) => `${p.prenda.nombre} (${ETIQUETA_PIEZA[estadoFinal(p)].toLowerCase()})`).join(", ")}`;
    });
  }

  async function resolver() {
    if (!accion) return;
    setEnviando(true);
    setError(null);
    try {
      const { data } = await api.post<Devolucion>(`/devoluciones/${d.id}/garantia`, {
        accion,
        motivo: motivo.trim() || undefined,
      });
      onCambio(data);
      onAviso(
        accion === "DEVOLVER"
          ? `Garantía de ${d.alquiler.usuario.nombre} devuelta: ${soles(garantia)}.`
          : `Garantía de ${d.alquiler.usuario.nombre} retenida.`
      );
      setAccion(null);
      setMotivo("");
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  }

  async function copiarId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <li className="card dev-card">
      <div className="dev-card__header">
        <span className="dev-card__codigo">#{d.id.slice(0, 8)}</span>
        <span className={`dev-pill dev-pill--${d.garantiaEstado.toLowerCase()}`}>{ETIQUETA_GARANTIA[d.garantiaEstado]}</span>
      </div>

      <div className="dev-card__meta">
        <div>
          <span className="dev-card__label">Cliente</span>
          <strong>{d.alquiler.usuario.nombre}</strong>
        </div>
        <div>
          <span className="dev-card__label">Correo</span>
          <strong>{d.alquiler.usuario.email}</strong>
        </div>
        <div>
          <span className="dev-card__label">Disfraz</span>
          <strong>{d.alquiler.disfraces.map((x) => x.disfrazFisico.nombre).join(", ") || "—"}</strong>
        </div>
        <div>
          <span className="dev-card__label">Devuelto el</span>
          <strong>{new Date(d.fechaDevolucion).toLocaleDateString("es-PE")}</strong>
        </div>
        <div>
          <span className="dev-card__label">Evento</span>
          <strong>{d.alquiler.evento || "—"}</strong>
        </div>
        <div>
          <span className="dev-card__label">Garantía cobrada</span>
          <strong>{soles(garantia)}</strong>
        </div>
      </div>

      {error && (
        <div className="alert alert--danger" role="alert">
          {error}
        </div>
      )}

      <ul className="dev-prendas">
        {d.prendas.map((p) => {
          const final = estadoFinal(p);
          const corregida = p.estadoAdmin !== null;
          return (
            <li key={p.id} className="dev-prenda">
              <div className="dev-prenda__info">
                <strong>{p.prenda.nombre}</strong>
                <span className="dev-prenda__meta">
                  {p.prenda.color} · {p.prenda.talla} · el cliente reportó: {ETIQUETA_PIEZA[p.estadoPrenda].toLowerCase()}
                </span>
              </div>

              {pendiente ? (
                <div className="dev-prenda__revision">
                  <label className="visually-hidden" htmlFor={`rev-${p.id}`}>
                    Estado de {p.prenda.nombre} según tu revisión
                  </label>
                  <select
                    id={`rev-${p.id}`}
                    value={final}
                    disabled={guardando === p.prendaId}
                    onChange={(e) => guardarPieza(p, e.target.value as EstadoPieza, notas[p.prendaId] ?? "")}
                  >
                    {(Object.keys(ETIQUETA_PIEZA) as EstadoPieza[]).map((e) => (
                      <option key={e} value={e}>
                        {ETIQUETA_PIEZA[e]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="Nota (opcional)"
                    aria-label={`Nota sobre ${p.prenda.nombre}`}
                    value={notas[p.prendaId] ?? ""}
                    onChange={(e) => setNotas((prev) => ({ ...prev, [p.prendaId]: e.target.value }))}
                    onBlur={() => {
                      if ((notas[p.prendaId] ?? "").trim() !== (p.observacion ?? "")) {
                        guardarPieza(p, final, notas[p.prendaId] ?? "");
                      }
                    }}
                  />
                  {corregida && <span className="dev-prenda__corregida">Corregida</span>}
                </div>
              ) : (
                <div className="dev-prenda__final">
                  <span className={`dev-estado dev-estado--${final.toLowerCase()}`}>{ETIQUETA_PIEZA[final]}</span>
                  {corregida && <span className="dev-prenda__corregida">Corregida por la tienda</span>}
                  {p.observacion && <span className="dev-prenda__nota">«{p.observacion}»</span>}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {pendiente && (
        <>
          <p className="dev-ayuda">
            Revisa el disfraz y corrige lo que no coincida. Si una prenda necesita reemplazo, búscalo en{" "}
            <Link to="/admin/inventario">Inventario Físico</Link>.
          </p>

          <p className={`dev-sugerencia ${problemas.length === 0 ? "dev-sugerencia--ok" : "dev-sugerencia--aviso"}`}>
            {problemas.length === 0
              ? "Todas las prendas están en buen estado: corresponde devolver la garantía."
              : `Hay ${problemas.length} prenda(s) con problemas: lo habitual es retener la garantía.`}
          </p>

          {accion === null && (
            <div className="dev-acciones">
              <button type="button" className="btn btn--primary" onClick={() => setAccion("DEVOLVER")}>
                Devolver garantía · {soles(garantia)}
              </button>
              <button type="button" className="btn btn--ghost" onClick={abrirRetener}>
                Retener garantía
              </button>
            </div>
          )}

          {accion === "DEVOLVER" && (
            <div className="dev-confirmar">
              <p>
                {d.alquiler.stripeSessionId
                  ? `Se reembolsarán ${soles(garantia)} a la tarjeta con la que se pagó este alquiler (Stripe).`
                  : "Este alquiler no tiene pago en Stripe (lo creó la tienda): se registrará como devuelta en mostrador."}
              </p>
              {problemas.length > 0 && (
                <p className="dev-confirmar__aviso">Hay prendas con problemas. ¿Devolver la garantía igualmente?</p>
              )}
              <div className="dev-acciones">
                <button type="button" className="btn btn--primary" disabled={enviando} onClick={resolver}>
                  {enviando ? "Procesando…" : `Sí, devolver ${soles(garantia)}`}
                </button>
                <button type="button" className="btn btn--ghost" disabled={enviando} onClick={() => setAccion(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {accion === "RETENER" && (
            <div className="dev-confirmar">
              <label htmlFor={`motivo-${d.id}`}>Motivo de la retención (obligatorio)</label>
              <textarea
                id={`motivo-${d.id}`}
                rows={2}
                maxLength={300}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. Falda con una mancha que no sale"
              />
              <p className="dev-ayuda">El dinero queda cobrado y el cliente verá este motivo en su comprobante.</p>
              <div className="dev-acciones">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={enviando || motivo.trim().length < 5}
                  onClick={resolver}
                >
                  {enviando ? "Guardando…" : "Confirmar retención"}
                </button>
                <button type="button" className="btn btn--ghost" disabled={enviando} onClick={() => setAccion(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {!pendiente && (
        <div className={`dev-comprobante ${d.garantiaEstado === "DEVUELTA" ? "dev-comprobante--ok" : "dev-comprobante--no"}`}>
          <strong>
            {d.garantiaEstado === "DEVUELTA" ? "Garantía devuelta" : "Garantía retenida"} · {soles(d.garantiaMonto ?? garantia)}
          </strong>
          <dl className="dev-comprobante__datos">
            <div>
              <dt>Resuelta el</dt>
              <dd>{d.garantiaResueltaEn ? new Date(d.garantiaResueltaEn).toLocaleString("es-PE") : "—"}</dd>
            </div>
            <div>
              <dt>Resuelta por</dt>
              <dd>{d.resueltaPor?.nombre ?? "—"}</dd>
            </div>
            {d.garantiaMotivo && (
              <div>
                <dt>Motivo</dt>
                <dd>{d.garantiaMotivo}</dd>
              </div>
            )}
            <div>
              <dt>Reembolso en Stripe</dt>
              <dd>
                {d.garantiaReembolsoId ? (
                  <>
                    <code>{d.garantiaReembolsoId}</code>{" "}
                    <button type="button" className="btn btn--ghost dev-comprobante__copiar" onClick={() => copiarId(d.garantiaReembolsoId as string)}>
                      {copiado ? "Copiado" : "Copiar"}
                    </button>
                  </>
                ) : d.garantiaEstado === "DEVUELTA" ? (
                  "Devuelta en mostrador (sin pago en Stripe)"
                ) : (
                  "Sin reembolso: el dinero queda cobrado"
                )}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </li>
  );
}

export default function Devoluciones() {
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("PENDIENTE");

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get<Devolucion[]>("/devoluciones");
      setDevoluciones(data);
      setError(null);
    } catch (err) {
      setError(mensajeDe(err, "No se pudieron cargar las devoluciones."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const resumen = useMemo(() => {
    const base: Record<EstadoGarantia, { n: number; monto: number }> = {
      PENDIENTE: { n: 0, monto: 0 },
      DEVUELTA: { n: 0, monto: 0 },
      RETENIDA: { n: 0, monto: 0 },
    };
    for (const d of devoluciones) {
      base[d.garantiaEstado].n++;
      base[d.garantiaEstado].monto += Number(d.garantiaMonto ?? d.alquiler.montoGarantia);
    }
    return base;
  }, [devoluciones]);

  const lista = devoluciones.filter((d) =>
    filtro === "TODAS" ? true : filtro === "PENDIENTE" ? d.garantiaEstado === "PENDIENTE" : d.garantiaEstado !== "PENDIENTE"
  );
  // Las pendientes se atienden en orden de llegada.
  if (filtro === "PENDIENTE") {
    lista.sort((a, b) => new Date(a.fechaDevolucion).getTime() - new Date(b.fechaDevolucion).getTime());
  }

  function reemplazar(nueva: Devolucion) {
    setDevoluciones((prev) => prev.map((x) => (x.id === nueva.id ? nueva : x)));
  }

  const resueltas = resumen.DEVUELTA.n + resumen.RETENIDA.n;
  const tabs: { clave: Filtro; texto: string }[] = [
    { clave: "PENDIENTE", texto: `Por resolver (${resumen.PENDIENTE.n})` },
    { clave: "RESUELTAS", texto: `Resueltas (${resueltas})` },
    { clave: "TODAS", texto: `Todas (${devoluciones.length})` },
  ];

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Devoluciones y garantías</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
        Revisa cada disfraz devuelto, corrige el estado de las prendas si hace falta y decide si se devuelve o se retiene la
        garantía. Al devolverla se hace el reembolso real en Stripe y queda el comprobante.
      </p>

      <div className="dev-resumen">
        <div className="dev-resumen__pill">
          Por resolver <strong>{resumen.PENDIENTE.n}</strong> · {soles(resumen.PENDIENTE.monto)}
        </div>
        <div className="dev-resumen__pill">
          Devueltas <strong>{resumen.DEVUELTA.n}</strong> · {soles(resumen.DEVUELTA.monto)}
        </div>
        <div className="dev-resumen__pill">
          Retenidas <strong>{resumen.RETENIDA.n}</strong> · {soles(resumen.RETENIDA.monto)}
        </div>
      </div>

      {error && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: "var(--space-3)" }}>
          {error}
        </div>
      )}
      {aviso && (
        <p className="dev-aviso" role="status">
          {aviso}
        </p>
      )}

      <div className="dev-tabs" role="tablist" aria-label="Filtrar devoluciones">
        {tabs.map((t) => (
          <button
            key={t.clave}
            type="button"
            role="tab"
            aria-selected={filtro === t.clave}
            className={`dev-tabs__btn ${filtro === t.clave ? "dev-tabs__btn--activo" : ""}`}
            onClick={() => setFiltro(t.clave)}
          >
            {t.texto}
          </button>
        ))}
      </div>

      {cargando ? (
        <p role="status">Cargando…</p>
      ) : lista.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>
          {filtro === "PENDIENTE" ? "No hay garantías por resolver." : "No hay devoluciones en esta vista."}
        </p>
      ) : (
        <ul className="dev-lista">
          {lista.map((d) => (
            <TarjetaDevolucion key={d.id} d={d} onCambio={reemplazar} onAviso={setAviso} />
          ))}
        </ul>
      )}
    </div>
  );
}