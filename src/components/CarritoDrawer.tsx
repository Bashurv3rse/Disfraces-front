import { useState } from "react";
import type { FormEvent } from "react";
import { useCarrito } from "../lib/CarritoContext";
import { api } from "../lib/api";
import "./carrito-drawer.css";

function calcularDias(fechaInicio: string, fechaFin: string): number {
  if (!fechaInicio || !fechaFin) return 1;
  const msPorDia = 1000 * 60 * 60 * 24;
  const dias = Math.round((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / msPorDia);
  return Math.max(1, dias);
}

export function CarritoDrawer() {
  const { items, quitarItem, totalPorDia, abierto, cerrarCarrito } = useCarrito();
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [evento, setEvento] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!abierto) return null;

  const dias = calcularDias(fechaInicio, fechaFin);
  const subtotal = totalPorDia * dias;
  const garantia = subtotal * 0.25;
  const total = subtotal + garantia;

  async function handlePagar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const { data } = await api.post("/pagos/crear-sesion", {
        fechaInicio,
        fechaFin,
        evento,
        disfraces: items.map((i) => i.disfrazFisicoId),
      });
      // Redirige la misma pestaña (no abre una nueva) — Stripe te trae de
      // vuelta a esta misma URL al terminar, así nunca quedan 2 pestañas.
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.response?.data?.mensaje || "No se pudo iniciar el pago");
      setGuardando(false);
    }
  }

  function handleCerrar() {
    setError(null);
    setFechaInicio("");
    setFechaFin("");
    setEvento("");
    cerrarCarrito();
  }

  return (
    <div className="carrito-overlay" onClick={handleCerrar}>
      <aside className="carrito-drawer" role="dialog" aria-modal="true" aria-label="Tu carrito" onClick={(e) => e.stopPropagation()}>
        <div className="carrito-drawer__header">
          <h2>Tu carrito</h2>
          <button type="button" className="carrito-drawer__cerrar" onClick={handleCerrar} aria-label="Cerrar carrito">×</button>
        </div>

        {items.length === 0 ? (
          <p className="carrito-drawer__vacio">Tu carrito está vacío.</p>
        ) : (
          <form onSubmit={handlePagar}>
            {error && <div className="alert alert--danger" role="alert">{error}</div>}

            <ul className="carrito-drawer__items">
              {items.map((item) => (
                <li key={item.disfrazFisicoId} className="carrito-drawer__item">
                  <div className="carrito-drawer__item-header">
                    <div>
                      <strong>{item.nombre}</strong>
                      <span className="carrito-drawer__item-tipo">{item.tipoDisfraz}</span>
                    </div>
                    <button
                      type="button"
                      className="carrito-drawer__quitar"
                      onClick={() => quitarItem(item.disfrazFisicoId)}
                      aria-label={`Quitar ${item.nombre} del carrito`}
                    >
                      ×
                    </button>
                  </div>
                  <span className="carrito-drawer__item-precio">S/{item.precioAlquiler}/día</span>
                </li>
              ))}
            </ul>

            <div className="carrito-drawer__resumen">
              <div className="carrito-drawer__resumen-linea">
                <span>Subtotal alquiler ({dias} día{dias > 1 ? "s" : ""})</span>
                <span>S/ {subtotal.toFixed(2)}</span>
              </div>
              <div className="carrito-drawer__resumen-linea">
                <span>Garantía (25%, reembolsable)</span>
                <span>S/ {garantia.toFixed(2)}</span>
              </div>
              <div className="carrito-drawer__resumen-linea carrito-drawer__resumen-linea--total">
                <span>Total a pagar</span>
                <span>S/ {total.toFixed(2)}</span>
              </div>
              <p className="carrito-drawer__resumen-nota">
                {fechaInicio && fechaFin
                  ? `${dias} día${dias > 1 ? "s" : ""} de alquiler. La garantía se devuelve completa si el disfraz vuelve en buen estado.`
                  : "Elige las fechas para ver el total exacto. La garantía se devuelve completa si el disfraz vuelve en buen estado."}
              </p>
            </div>

            <div className="field">
              <label htmlFor="fecha-inicio">Fecha inicio</label>
              <input id="fecha-inicio" type="date" required value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="fecha-fin">Fecha fin</label>
              <input id="fecha-fin" type="date" required value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="evento">Ocasión / evento</label>
              <input id="evento" type="text" placeholder="Ej: fiesta de Halloween…" value={evento} onChange={(e) => setEvento(e.target.value)} />
            </div>

            <button type="submit" className="btn btn--primary" style={{ width: "100%" }} disabled={guardando}>
              {guardando ? "Redirigiendo…" : `Pagar · S/ ${total.toFixed(2)}`}
            </button>
          </form>
        )}
      </aside>
    </div>
  );
}