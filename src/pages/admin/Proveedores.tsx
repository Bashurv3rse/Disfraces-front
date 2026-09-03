import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../lib/api";
import "./proveedores.css";

interface Proveedor {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string | null;
  email: string | null;
  piezas: { pieza: { id: string; nombre: string } }[];
}

export default function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    const { data } = await api.get("/proveedores");
    setProveedores(data);
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

  return (
    <div>
      <div className="proveedores__header">
        <div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Proveedores</h1>
          <p style={{ color: "var(--text-muted)" }}>Gestiona quién suministra cada pieza del catálogo.</p>
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
          {proveedores.map((p) => (
            <li key={p.id} className="card proveedores__item">
              <h2 style={{ fontSize: "1.05rem" }}>{p.nombre}</h2>
              <p className="proveedores__meta">Contacto: {p.contacto}</p>
              {p.telefono && <p className="proveedores__meta">Tel: {p.telefono}</p>}
              {p.email && <p className="proveedores__meta">{p.email}</p>}
              <p className="proveedores__piezas-count">{p.piezas.length} pieza(s) asociada(s)</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}