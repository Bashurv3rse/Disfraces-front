import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../lib/api";
import { iconoPorTipo, colorPorSemilla } from "../../lib/iconos";
import "./proveedores.css";

interface PiezaAsociada {
  pieza: { id: string; nombre: string; tipo: string; stock: number };
}

interface Proveedor {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string | null;
  email: string | null;
  piezas: PiezaAsociada[];
}

interface PiezaCatalogo {
  id: string;
  nombre: string;
  stock: number;
}

export default function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [catalogo, setCatalogo] = useState<PiezaCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [piezaSeleccionada, setPiezaSeleccionada] = useState<Record<string, string>>({});
  const [ajustandoId, setAjustandoId] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    const [{ data: prov }, { data: cat }] = await Promise.all([api.get("/proveedores"), api.get("/catalogo")]);
    setProveedores(prov);
    setCatalogo(cat);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await api.post("/proveedores", { nombre, contacto, telefono: telefono || undefined, email: email || undefined });
      setNombre("");
      setContacto("");
      setTelefono("");
      setEmail("");
      setMostrarForm(false);
      cargar();
    } catch (err: any) {
      setError(err.response?.data?.mensaje || "No se pudo registrar el proveedor");
    } finally {
      setGuardando(false);
    }
  }

  async function asociarPieza(proveedorId: string) {
    const piezaId = piezaSeleccionada[proveedorId];
    if (!piezaId) return;
    await api.post(`/proveedores/${proveedorId}/piezas`, { piezaId });
    setPiezaSeleccionada((prev) => ({ ...prev, [proveedorId]: "" }));
    cargar();
  }

  async function ajustarStock(piezaId: string, delta: number, stockActual: number) {
    const nuevoStock = Math.max(0, stockActual + delta);
    setAjustandoId(piezaId);
    try {
      await api.patch(`/catalogo/${piezaId}/stock`, { stock: nuevoStock });
      await cargar();
    } finally {
      setAjustandoId(null);
    }
  }

  return (
    <div>
      <div className="proveedores__header">
        <div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Proveedores</h1>
          <p style={{ color: "var(--text-muted)" }}>Gestiona quién suministra cada pieza y su stock.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cancelar" : "+ Nuevo proveedor"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="card proveedores__form">
          {error && (
            <div className="alert alert--danger" role="alert">
              {error}
            </div>
          )}
          <div className="proveedores__form-grid">
            <div className="field">
              <label htmlFor="prov-nombre">Nombre</label>
              <input id="prov-nombre" type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="prov-contacto">Persona de contacto</label>
              <input id="prov-contacto" type="text" required value={contacto} onChange={(e) => setContacto(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="prov-telefono">Teléfono (opcional)</label>
              <input id="prov-telefono" type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="prov-email">Email (opcional)</label>
              <input id="prov-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn btn--primary" disabled={guardando}>
            {guardando ? "Guardando…" : "Registrar proveedor"}
          </button>
        </form>
      )}

      {cargando ? (
        <p role="status">Cargando proveedores…</p>
      ) : proveedores.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Aún no hay proveedores registrados.</p>
      ) : (
        <ul className="proveedores__lista">
          {proveedores.map((p) => {
            const expandido = expandidoId === p.id;
            const piezasAsociadasIds = new Set(p.piezas.map((pp) => pp.pieza.id));
            const piezasDisponibles = catalogo.filter((c) => !piezasAsociadasIds.has(c.id));

            return (
              <li key={p.id} className="card proveedores__item">
                <h2 style={{ fontSize: "1.05rem" }}>{p.nombre}</h2>
                <p className="proveedores__meta">Contacto: {p.contacto}</p>
                {p.telefono && <p className="proveedores__meta">Tel: {p.telefono}</p>}
                {p.email && <p className="proveedores__meta">{p.email}</p>}
                <button
                  type="button"
                  className="btn btn--ghost proveedores__toggle"
                  onClick={() => setExpandidoId(expandido ? null : p.id)}
                >
                  {p.piezas.length} pieza(s) asociada(s) {expandido ? "▲" : "▼"}
                </button>

                {expandido && (
                  <div className="proveedores__detalle">
                    {p.piezas.length > 0 && (
                      <ul className="proveedores__piezas-lista">
                        {p.piezas.map((pp) => (
                          <li key={pp.pieza.id} className="proveedores__pieza">
                            <span
                              className="proveedores__pieza-icono"
                              style={{ background: colorPorSemilla(pp.pieza.tipo) }}
                              aria-hidden="true"
                            >
                              {iconoPorTipo(pp.pieza.tipo)}
                            </span>
                            <span className="proveedores__pieza-nombre">{pp.pieza.nombre}</span>
                            <div className="proveedores__pieza-stock">
                              <button
                                type="button"
                                className="btn btn--ghost"
                                disabled={ajustandoId === pp.pieza.id || pp.pieza.stock === 0}
                                onClick={() => ajustarStock(pp.pieza.id, -1, pp.pieza.stock)}
                                aria-label={`Reducir stock de ${pp.pieza.nombre}`}
                              >
                                −
                              </button>
                              <span>{pp.pieza.stock}</span>
                              <button
                                type="button"
                                className="btn btn--ghost"
                                disabled={ajustandoId === pp.pieza.id}
                                onClick={() => ajustarStock(pp.pieza.id, 1, pp.pieza.stock)}
                                aria-label={`Aumentar stock de ${pp.pieza.nombre}`}
                              >
                                +
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {piezasDisponibles.length > 0 && (
                      <div className="proveedores__asociar">
                        <select
                          aria-label={`Asociar pieza a ${p.nombre}`}
                          value={piezaSeleccionada[p.id] || ""}
                          onChange={(e) => setPiezaSeleccionada((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        >
                          <option value="">Elige una pieza para asociar…</option>
                          {piezasDisponibles.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn--primary"
                          disabled={!piezaSeleccionada[p.id]}
                          onClick={() => asociarPieza(p.id)}
                        >
                          Asociar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}