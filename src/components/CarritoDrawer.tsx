import { useState } from "react";
import type { FormEvent } from "react";
import { useCarrito } from "../lib/CarritoContext";
import { useAlquileres } from "../lib/AlquileresContext";
import { useAuth } from "../lib/AuthContext";
import "./carrito-drawer.css";

export function CarritoDrawer() {
  const { items, quitarItem, vaciarCarrito, totalPorDia, abierto, cerrarCarrito } = useCarrito();
  const { confirmarAlquiler } = useAlquileres();
  const { usuario } = useAuth();
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [evento, setEvento] = useState("");
  const [confirmado, setConfirmado] = useState(false);

  if (!abierto) return null;

  function handleConfirmar(e: FormEvent) {
    e.preventDefault();

    const piezasCombinadas = items.flatMap((item) => item.piezas);
    const nombreCombinado = items.map((item) => item.nombreConjunto).join(" + ");

    confirmarAlquiler({
      nombreConjunto: nombreCombinado,
      piezas: piezasCombinadas,
      fechaInicio,
      fechaFin,
      evento,
      montoTotal: totalPorDia,
      clienteNombre: usuario?.nombre || "Desconocido",
      clienteEmail: usuario?.email || "—",
    });

    vaciarCarrito();
    setConfirmado(true);
  }

  function handleCerrar() {
    setConfirmado(false);
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

            <button type="submit" className="btn btn--primary" style={{ width: "100%" }}>
              Confirmar alquiler · S/ {totalPorDia.toFixed(2)}/día
            </button>
          </form>
        )}
      </aside>
    </div>
  );
} 