import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import { iconoPorTipo, colorPorSemilla } from "../../lib/iconos";
import "./stock.css";

interface Pieza {
  id: string;
  nombre: string;
  tipo: string;
  tallaEEUU: string;
  color: string;
  temporadaOriginal: string;
  stock: number;
  precioAlquiler: string;
}

const UMBRAL_BAJO = 6;

export default function Stock() {
  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data } = await api.get("/catalogo");
    setPiezas(data);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function ajustarStock(id: string, delta: number, stockActual: number) {
    const nuevoStock = Math.max(0, stockActual + delta);
    setActualizandoId(id);
    try {
      await api.patch(`/catalogo/${id}/stock`, { stock: nuevoStock });
      setPiezas((prev) => prev.map((p) => (p.id === id ? { ...p, stock: nuevoStock } : p)));
    } finally {
      setActualizandoId(null);
    }
  }

  const piezasFiltradas = piezas.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const totalUnidades = piezas.reduce((s, p) => s + p.stock, 0);
  const stockBajo = piezas.filter((p) => p.stock > 0 && p.stock <= UMBRAL_BAJO).length;
  const sinStock = piezas.filter((p) => p.stock === 0).length;

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Visualización de stock</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
        Inventario en tiempo real — ajusta el stock directamente aquí.
      </p>

      <div className="stock-metricas">
        <div className="card stock-metrica">
          <span className="stock-metrica__label">Total piezas</span>
          <strong className="stock-metrica__valor">{piezas.length}</strong>
        </div>
        <div className="card stock-metrica">
          <span className="stock-metrica__label">Unidades en stock</span>
          <strong className="stock-metrica__valor">{totalUnidades}</strong>
        </div>
        <div className="card stock-metrica">
          <span className="stock-metrica__label">Stock bajo</span>
          <strong className="stock-metrica__valor" style={{ color: "#A5730F" }}>{stockBajo}</strong>
        </div>
        <div className="card stock-metrica">
          <span className="stock-metrica__label">Sin stock</span>
          <strong className="stock-metrica__valor" style={{ color: "var(--danger)" }}>{sinStock}</strong>
        </div>
      </div>

      <div className="field" style={{ maxWidth: 320, marginBottom: "var(--space-4)" }}>
        <label htmlFor="buscar-pieza">Buscar pieza</label>
        <input id="buscar-pieza" type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      {cargando ? (
        <p role="status">Cargando inventario…</p>
      ) : (
        <ul className="stock-lista">
          {piezasFiltradas.map((p) => {
            const nivel = p.stock === 0 ? "sin-stock" : p.stock <= UMBRAL_BAJO ? "bajo" : "ok";
            return (
              <li key={p.id} className="card stock-item">
                <div
                  className="stock-item__icono"
                  style={{ background: colorPorSemilla(p.tipo) }}
                  aria-hidden="true"
                >
                  {iconoPorTipo(p.tipo)}
                </div>
                <div className="stock-item__info">
                  <strong>{p.nombre}</strong>
                  <span className="stock-item__meta">
                    {p.tipo.replace("_", " / ")} · {p.temporadaOriginal} · S/{p.precioAlquiler}/d
                  </span>
                </div>
                <span className={`stock-nivel stock-nivel--${nivel}`}>
                  {nivel === "sin-stock" ? "Sin stock" : nivel === "bajo" ? "Bajo" : "OK"}
                </span>
                <div className="stock-item__controles">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => ajustarStock(p.id, -1, p.stock)}
                    disabled={actualizandoId === p.id || p.stock === 0}
                    aria-label={`Reducir stock de ${p.nombre}`}
                  >
                    −
                  </button>
                  <span className="stock-item__cantidad">{p.stock}</span>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => ajustarStock(p.id, 1, p.stock)}
                    disabled={actualizandoId === p.id}
                    aria-label={`Aumentar stock de ${p.nombre}`}
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}