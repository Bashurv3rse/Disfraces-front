import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../lib/api";
import { iconoPorTipo, colorPorSemilla } from "../../lib/iconos";
import "./proveedores.css";

interface PrendaAsociada {
  prenda: { id: string; nombre: string; tipo: string };
}

interface Proveedor {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string | null;
  email: string | null;
  prendas: PrendaAsociada[];
}

interface PrendaCatalogo {
  id: string;
  nombre: string;
}

export default function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [prendasDisponibles, setPrendasDisponibles] = useState<PrendaCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [prendaSeleccionada, setPrendaSeleccionada] = useState<Record<string, string>>({});

  async function cargar() {
    setCargando(true);
    const [{ data: prov }, { data: disfraces }] = await Promise.all([api.get("/proveedores"), api.get("/disfraces")]);
    setProveedores(prov);
    const todasLasPrendas = disfraces.flatMap((d: any) => d.prendasHogar);
    setPrendasDisponibles(todasLasPrendas);
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

  async function asociarPrenda(proveedorId: string) {
    const prendaId = prendaSeleccionada[proveedorId];
    if (!prendaId) return;
    await api.post(`/proveedores/${proveedorId}/piezas`, { prendaId });
    setPrendaSeleccionada((prev) => ({ ...prev, [proveedorId]: "" }));
    cargar();
  }

  return (
    <div>
      <div className="proveedores__header">
        <div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Proveedores</h1>
          <p style={{ color: "var(--text-muted)" }}>Gestiona quién suministra cada prenda.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cancelar" : "+ Nuevo proveedor"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="card proveedores__form">
          {error && <div className="alert alert--danger" role="alert">{error}</div>}
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
            const asociadasIds = new Set(p.prendas.map((pp) => pp.prenda.id));
            const disponibles = prendasDisponibles.filter((c) => !asociadasIds.has(c.id));

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
                  {p.prendas.length} prenda(s) asociada(s) {expandido ? "▲" : "▼"}
                </button>

                {expandido && (
                  <div className="proveedores__detalle">
                    {p.prendas.length > 0 && (
                      <ul className="proveedores__piezas-lista">
                        {p.prendas.map((pp) => (
                          <li key={pp.prenda.id} className="proveedores__pieza">
                            <span className="proveedores__pieza-icono" style={{ background: colorPorSemilla(pp.prenda.tipo) }} aria-hidden="true">
                              {iconoPorTipo(pp.prenda.tipo)}
                            </span>
                            <span className="proveedores__pieza-nombre">{pp.prenda.nombre}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {disponibles.length > 0 && (
                      <div className="proveedores__asociar">
                        <select
                          aria-label={`Asociar prenda a ${p.nombre}`}
                          value={prendaSeleccionada[p.id] || ""}
                          onChange={(e) => setPrendaSeleccionada((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        >
                          <option value="">Elige una prenda para asociar…</option>
                          {disponibles.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                        <button type="button" className="btn btn--primary" disabled={!prendaSeleccionada[p.id]} onClick={() => asociarPrenda(p.id)}>
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