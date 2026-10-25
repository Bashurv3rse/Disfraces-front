import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import { ReportarDevolucion } from "../../components/ReportarDevolucion";
import "./mis-alquileres.css";

interface Prenda {
  id: string;
  nombre: string;
  tipo: string;
  color: string;
  talla: string;
}

interface AlquilerDisfraz {
  precioUnitario: string;
  disfrazFisico: {
    id: string;
    nombre: string;
    tipoDisfraz: string;
    prendasActuales: Prenda[];
  };
}

interface Alquiler {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  evento: string | null;
  estado: "PENDIENTE" | "ACTIVO" | "FINALIZADO" | "CANCELADO";
  montoTotal: string;
  montoGarantia: string;
  descuento: string;
  detalleDescuento: string | null;
  disfraces: AlquilerDisfraz[];
  devolucion: ComprobanteGarantia | null;
}

type EstadoPieza = "BUEN_ESTADO" | "DANADA" | "FALTANTE";

interface ComprobanteGarantia {
  fechaDevolucion: string;
  garantiaEstado: "PENDIENTE" | "DEVUELTA" | "RETENIDA";
  garantiaMonto: string | null;
  garantiaMotivo: string | null;
  garantiaReembolsoId: string | null;
  garantiaResueltaEn: string | null;
  prendas: {
    estadoPrenda: EstadoPieza;
    estadoAdmin: EstadoPieza | null;
    observacion: string | null;
    prenda: { id: string; nombre: string; color: string; talla: string };
  }[];
}

function estaVencido(fechaFin: string): boolean {
  const hoyUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  return new Date(fechaFin) < hoyUTC;
}

const ETIQUETA_PIEZA: Record<EstadoPieza, string> = {
  BUEN_ESTADO: "Buen estado",
  DANADA: "Dañada",
  FALTANTE: "Faltante",
};

function GarantiaComprobante({ c, montoGarantia }: { c: ComprobanteGarantia; montoGarantia: string }) {
  const monto = Number(c.garantiaMonto ?? montoGarantia).toFixed(2);
  const fecha = c.garantiaResueltaEn ? new Date(c.garantiaResueltaEn).toLocaleDateString("es-PE") : null;

  return (
    <div className={`garantia garantia--${c.garantiaEstado.toLowerCase()}`}>
      {c.garantiaEstado === "PENDIENTE" && (
        <>
          <strong>Tu garantía está en revisión</strong>
          <p>La tienda está revisando el disfraz. Aquí te confirmaremos si se devuelve tu garantía de S/ {monto}.</p>
        </>
      )}

      {c.garantiaEstado === "DEVUELTA" && (
        <>
          <strong>
            Garantía devuelta: S/ {monto}
            {fecha ? ` · ${fecha}` : ""}
          </strong>
          {c.garantiaReembolsoId ? (
            <p>
              El reembolso va a la tarjeta con la que pagaste. Comprobante: <code>{c.garantiaReembolsoId}</code>
            </p>
          ) : (
            <p>Se te entregó en la tienda.</p>
          )}
        </>
      )}

      {c.garantiaEstado === "RETENIDA" && (
        <>
          <strong>
            Garantía retenida: S/ {monto}
            {fecha ? ` · ${fecha}` : ""}
          </strong>
          {c.garantiaMotivo && <p>Motivo: {c.garantiaMotivo}</p>}
        </>
      )}

      <details className="garantia__prendas">
        <summary>Ver la revisión de las prendas</summary>
        <ul>
          {c.prendas.map((p) => {
            const final = p.estadoAdmin ?? p.estadoPrenda;
            return (
              <li key={p.prenda.id}>
                {p.prenda.nombre} · {p.prenda.color} · {p.prenda.talla}: <strong>{ETIQUETA_PIEZA[final]}</strong>
                {p.estadoAdmin && ` (tú reportaste: ${ETIQUETA_PIEZA[p.estadoPrenda].toLowerCase()})`}
                {p.observacion && ` — «${p.observacion}»`}
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}

export default function MisAlquileres() {
  const [alquileres, setAlquileres] = useState<Alquiler[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<"ACTIVO" | "FINALIZADO">("ACTIVO");
  const [devolviendo, setDevolviendo] = useState<Alquiler | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data } = await api.get("/alquileres/mios");
    setAlquileres(data);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const activos = alquileres.filter((a) => a.estado === "ACTIVO" || a.estado === "PENDIENTE");
  const historial = alquileres.filter((a) => a.estado === "FINALIZADO" || a.estado === "CANCELADO");
  const lista = pestana === "ACTIVO" ? activos : historial;
  const vencidosCount = activos.filter((a) => estaVencido(a.fechaFin)).length;

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-2)" }}>Mis alquileres</h1>

      {vencidosCount > 0 && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: "var(--space-4)" }}>
          Tienes {vencidosCount} alquiler(es) con la fecha de devolución vencida. Devuélvelo(s) cuanto antes.
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="Filtrar alquileres" style={{ marginBottom: "var(--space-5)" }}>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "ACTIVO"}
          className={`tabs__btn ${pestana === "ACTIVO" ? "tabs__btn--activo" : ""}`}
          onClick={() => setPestana("ACTIVO")}
        >
          Activos ({activos.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "FINALIZADO"}
          className={`tabs__btn ${pestana === "FINALIZADO" ? "tabs__btn--activo" : ""}`}
          onClick={() => setPestana("FINALIZADO")}
        >
          Historial ({historial.length})
        </button>
      </div>

      {cargando ? (
        <p role="status" style={{ marginTop: "var(--space-5)" }}>Cargando…</p>
      ) : lista.length === 0 ? (
        <p style={{ color: "var(--text-muted)", marginTop: "var(--space-5)" }}>
          No tienes alquileres {pestana === "ACTIVO" ? "activos" : "en tu historial"} todavía.
        </p>
      ) : (
        <ul className="alquileres-lista">
          {lista.map((a) => {
            const vencido = pestana === "ACTIVO" && estaVencido(a.fechaFin);
            return (
              <li key={a.id} className={`card alquiler-card ${vencido ? "alquiler-card--vencido" : ""}`}>
                <div className="alquiler-card__header">
                  <h2 style={{ fontSize: "1.05rem" }}>{a.evento || "Alquiler"}</h2>
                  <span className={`estado-badge ${a.estado === "ACTIVO" ? "estado-badge--activo" : ""}`}>
                    {a.estado === "ACTIVO" ? "Activo" : a.estado === "PENDIENTE" ? "Pendiente" : "Finalizado"}
                  </span>
                </div>

                {vencido && (
                  <p className="alquiler-card__vencido-aviso">
                    ⚠ La fecha de devolución ya pasó. Debes devolverlo y reportar el estado.
                  </p>
                )}

                <div className="alquiler-card__fechas">
                  <div>
                    <span className="alquiler-card__label">Inicio</span>
                    <strong>{new Date(a.fechaInicio).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span className="alquiler-card__label">Fin</span>
                    <strong>{new Date(a.fechaFin).toLocaleDateString()}</strong>
                  </div>
                </div>

                <ul className="alquiler-card__piezas">
                  {a.disfraces.map((ad) => (
                    <li key={ad.disfrazFisico.id}>
                      <span>{ad.disfrazFisico.nombre} <span className="alquiler-card__talla">{ad.disfrazFisico.tipoDisfraz}</span></span>
                      <span className="alquiler-card__precio-unit">S/{ad.precioUnitario}/d</span>
                    </li>
                  ))}
                </ul>
                {Number(a.descuento) > 0 && (
                  <p className="alquiler-card__descuento">
                    Descuento aplicado: −S/ {Number(a.descuento).toFixed(2)}
                    {a.detalleDescuento ? ` · ${a.detalleDescuento}` : ""}
                  </p>
                )}
                <p className="alquiler-card__garantia">
                  Garantía (25%): S/ {Number(a.montoGarantia).toFixed(2)} — se devuelve si la tienda confirma que el disfraz vuelve en buen estado
                </p>
                {a.devolucion && <GarantiaComprobante c={a.devolucion} montoGarantia={a.montoGarantia} />}
                <div className="alquiler-card__footer">
                  <span className="alquiler-card__total">S/ {Number(a.montoTotal).toFixed(2)} total</span>
                  {pestana === "ACTIVO" && (
                    <button type="button" className="btn btn--primary" onClick={() => setDevolviendo(a)}>
                      Devolver
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {devolviendo && (
        <ReportarDevolucion
          alquilerId={devolviendo.id}
          disfraces={devolviendo.disfraces}
          onCerrar={() => setDevolviendo(null)}
          onConfirmado={() => {
            setDevolviendo(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}