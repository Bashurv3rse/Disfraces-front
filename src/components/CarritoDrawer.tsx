import { useState } from "react";
import type { FormEvent } from "react";
import { useCarrito } from "../lib/CarritoContext";
import { api } from "../lib/api";
import "./carrito-drawer.css";

export function CarritoDrawer() {
  const { items, quitarItem, vaciarCarrito, totalPorDia, abierto, cerrarCarrito } = useCarrito();
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [evento, setEvento] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!abierto) return null;

  async function handleConfirmar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const piezas = items.flatMap((item) =>
      item.piezas.map((p) => ({ piezaId: p.id, tallaElegida: p.tallaEEUU, colorElegido: p.color }))
    );

    try {
      await api.post("/alquileres", { fechaInicio, fechaFin, evento, piezas });
      vaciarCarrito();
      setConfirmado(true);
    } catch (err: any) {
      setError(err.response?.data?.mensaje || "No se pudo confirmar el alquiler");
    } finally {
      setGuardando(false);
    }
  }

  function handleCerrar() {
    setConfirmado(false);
    setError(null);
    setFechaInicio("");
    setFechaFin("");
    setEvento("");
    cerrarCarrito();
  }

  return (
    <div className="carrito-overlay" onClick={handleCerrar}>
      <aside
        className="carrito-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Tu carrito"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="carrito-drawer__header">
          <h2>Tu carrito</h2>
          <button type="button" className="carrito-drawer__cerrar" onClick={handleCerrar} aria-label="Cerrar carrito">
            ×
          </button>
        </div>

        {confirmado ? (
          <div className="carrito-drawer__confirmado">
            <p>¡Alquiler confirmado! 🎉</p>
            <a href="/mis-alquileres" className="btn btn--primary">Ver mis alquileres</a>
          </div>
        ) : items.length === 0 ? (
          <p className="carrito-drawer__vacio">Tu carrito está vacío.</p>
        ) : (
          <form onSubmit={handleConfirmar}>
            {error && (
              <div className="alert alert--danger" role="alert">
                {error}
              </div>
            )}

            <ul className="carrito-drawer__items">
              {items.map((item) => (
                <li key={item.id} className="carrito-drawer__item">
                  <div className="carrito-drawer__item-header">
                    <strong>{item.nombreConjunto}</strong>
                    <button
                      type="button"
                      className="carrito-drawer__quitar"
                      onClick={() => quitarItem(item.id)}
                      aria-label={`Quitar ${item.nombreConjunto} del carrito`}
                    >
                      ×
                    </button>
                  </div>
                  <ul className="carrito-drawer__piezas">
                    {item.piezas.map((p) => (
                      <li key={p.id}>
                        {p.nombre} · T:{p.tallaEEUU} · S/{p.precioAlquiler}/d
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            <p className="carrito-drawer__aviso">
              Todo lo de arriba se guardará como un solo alquiler, con las mismas fechas y evento.
            </p>

            <div className="carrito-drawer__resumen">
              <div className="carrito-drawer__resumen-linea">
                <span>Subtotal alquiler</span>
                <span>S/ {totalPorDia.toFixed(2)}/día</span>
              </div>
              <div className="carrito-drawer__resumen-linea">
                <span>Garantía (20%, reembolsable)</span>
                <span>S/ {(totalPorDia * 0.2).toFixed(2)}</span>
              </div>
              <div className="carrito-drawer__resumen-linea carrito-drawer__resumen-linea--total">
                <span>Total a pagar</span>
                <span>S/ {(totalPorDia * 1.2).toFixed(2)}</span>
              </div>
              <p className="carrito-drawer__resumen-nota">
                La garantía se devuelve completa si el conjunto vuelve en buen estado.
              </p>
            </div>

            <div className="field">
              <label htmlFor="fecha-inicio">Fecha inicio</label>
              <input
                id="fecha-inicio"
                type="date"
                required
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="fecha-fin">Fecha fin</label>
              <input
                id="fecha-fin"
                type="date"
                required
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="evento">Ocasión / evento</label>
              <input
                id="evento"
                type="text"
                placeholder="Ej: fiesta de Halloween, obra de teatro…"
                value={evento}
                onChange={(e) => setEvento(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn--primary" style={{ width: "100%" }} disabled={guardando}>
              {guardando ? "Confirmando…" : `Confirmar alquiler · S/ ${(totalPorDia * 1.2).toFixed(2)}`}
            </button>
          </form>
        )}
      </aside>
    </div>
  );
}