import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { TIPOS_PRENDA, etiquetaTipo } from "../../lib/prendas";
import "./recetas.css";

interface Hueco {
  id: string;
  etiqueta: string;
  tipo: string;
  colores: string[];
  nombreContiene: string | null;
  obligatoria: boolean;
  stock: number;
}

interface Receta {
  id: string;
  nombre: string;
  descripcion: string | null;
  palabrasClave: string[];
  precioDia: string;
  activa: boolean;
  viable: boolean;
  piezas: Hueco[];
}

interface HuecoForm {
  clave: number;
  etiqueta: string;
  tipo: string;
  colores: string;
  nombreContiene: string;
  obligatoria: boolean;
}

function mensajesDe(err: unknown): string[] {
  const data = (err as { response?: { data?: { mensaje?: string; errores?: Record<string, string[] | undefined> } } })
    ?.response?.data;
  if (data?.mensaje) return [data.mensaje];
  if (data?.errores) {
    const lista = Object.entries(data.errores).flatMap(([campo, msgs]) => (msgs ?? []).map((t) => `${campo}: ${t}`));
    if (lista.length) return lista;
  }
  return ["No se pudo completar la acción."];
}

export default function Recetas() {
  const contador = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();
  const prellenar = (location.state as { prellenar?: { nombre: string; palabrasClave: string } } | null)?.prellenar;
  const nuevoHueco = (datos: Partial<HuecoForm> = {}): HuecoForm => ({
    clave: ++contador.current,
    etiqueta: "",
    tipo: "CAMISA",
    colores: "",
    nombreContiene: "",
    obligatoria: true,
    ...datos,
  });

  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [palabras, setPalabras] = useState("");
  const [precio, setPrecio] = useState("");
  const [activa, setActiva] = useState(true);
  const [huecos, setHuecos] = useState<HuecoForm[]>(() => [nuevoHueco()]);
  const [erroresForm, setErroresForm] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get<Receta[]>("/recetas");
      setRecetas(data);
    } catch (err) {
      setError(mensajesDe(err)[0]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

    // Llegada desde «Pedidos sin receta»: se abre el formulario con el nombre y la palabra clave ya escritos.
  useEffect(() => {
    if (!prellenar) return;
    setEditandoId(null);
    setNombre(prellenar.nombre);
    setPalabras(prellenar.palabrasClave);
    setFormAbierto(true);
    // Se limpia el estado de la navegación para que recargar la página no vuelva a abrir el formulario.
    navigate(location.pathname, { replace: true, state: null });
  }, []);

  function limpiarFormulario() {
    setEditandoId(null);
    setNombre("");
    setDescripcion("");
    setPalabras("");
    setPrecio("");
    setActiva(true);
    setHuecos([nuevoHueco()]);
    setErroresForm([]);
  }

  function abrirNueva() {
    limpiarFormulario();
    setFormAbierto(true);
    setAviso(null);
  }

  function abrirEdicion(r: Receta) {
    setEditandoId(r.id);
    setNombre(r.nombre);
    setDescripcion(r.descripcion ?? "");
    setPalabras(r.palabrasClave.join(", "));
    setPrecio(String(Number(r.precioDia)));
    setActiva(r.activa);
    setHuecos(
      r.piezas.map((p) =>
        nuevoHueco({
          etiqueta: p.etiqueta,
          tipo: p.tipo,
          colores: p.colores.join(", "),
          nombreContiene: p.nombreContiene ?? "",
          obligatoria: p.obligatoria,
        })
      )
    );
    setErroresForm([]);
    setFormAbierto(true);
    setAviso(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cerrarFormulario() {
    setFormAbierto(false);
    limpiarFormulario();
  }

  function cambiarHueco<K extends keyof HuecoForm>(clave: number, campo: K, valor: HuecoForm[K]) {
    setHuecos((prev) => prev.map((h) => (h.clave === clave ? { ...h, [campo]: valor } : h)));
  }

  async function handleGuardar(e: FormEvent) {
    e.preventDefault();
    setErroresForm([]);

    const cuerpo = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      palabrasClave: palabras.split(",").map((p) => p.trim()).filter(Boolean),
      precioDia: Number(precio),
      activa,
      piezas: huecos.map((h) => ({
        etiqueta: h.etiqueta.trim(),
        tipo: h.tipo,
        colores: h.colores.split(",").map((c) => c.trim()).filter(Boolean),
        nombreContiene: h.nombreContiene.trim() || undefined,
        obligatoria: h.obligatoria,
      })),
    };

    setGuardando(true);
    try {
      const { data } = editandoId
        ? await api.put<{ peticionesVinculadas?: number }>(`/recetas/${editandoId}`, cuerpo)
        : await api.post<{ peticionesVinculadas?: number }>("/recetas", cuerpo);
      const vinculadas = data.peticionesVinculadas ?? 0;
      const base = `Receta «${cuerpo.nombre}» ${editandoId ? "actualizada" : "creada"}.`;
      setAviso(vinculadas > 0 ? `${base} ${vinculadas} pedido(s) de clientes quedaron atendidos con esta receta.` : base);
      cerrarFormulario();
      await cargar();
    } catch (err) {
      setErroresForm(mensajesDe(err));
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActiva(r: Receta) {
    setError(null);
    setAviso(null);
    try {
      await api.patch(`/recetas/${r.id}/activa`, { activa: !r.activa });
      setAviso(`Receta «${r.nombre}» ${r.activa ? "desactivada" : "activada"}.`);
      await cargar();
    } catch (err) {
      setError(mensajesDe(err)[0]);
    }
  }

  async function eliminar(r: Receta) {
    setError(null);
    setAviso(null);
    try {
      await api.delete(`/recetas/${r.id}`);
      setConfirmandoId(null);
      setAviso(`Receta «${r.nombre}» eliminada.`);
      await cargar();
    } catch (err) {
      setConfirmandoId(null);
      setError(mensajesDe(err)[0]);
    }
  }

  return (
    <div className="recetas">
      <Link to="/admin/inventario" className="recetas__volver">
        ← Inventario Físico
      </Link>
      <div className="recetas__encabezado">
        <div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Recetas de disfraces a medida</h1>
          <p className="recetas__subtitulo">
            Una receta dice qué piezas lleva un disfraz que no está en el catálogo (bombero, doctor…). El cliente
            escribe lo que quiere y el sistema busca la receta por sus palabras clave.
          </p>
        </div>
        {!formAbierto && (
          <button type="button" className="btn btn--primary" onClick={abrirNueva}>
            + Nueva receta
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: "var(--space-3)" }}>
          {error}
        </div>
      )}
      {aviso && (
        <p className="recetas__aviso" role="status">
          {aviso}
        </p>
      )}

      {formAbierto && (
        <form className="card recetas__form" onSubmit={handleGuardar}>
          <h2>{editandoId ? "Editar receta" : "Nueva receta"}</h2>

          {erroresForm.length > 0 && (
            <div className="alert alert--danger" role="alert">
              <ul className="recetas__errores">
                {erroresForm.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="recetas__grid">
            <div className="field">
              <label htmlFor="rec-nombre">Nombre</label>
              <input
                id="rec-nombre"
                type="text"
                required
                minLength={2}
                maxLength={60}
                placeholder="Ej. Bombero"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="rec-precio">Precio por día (S/)</label>
              <input
                id="rec-precio"
                type="number"
                required
                min="1"
                step="0.5"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="rec-palabras">Palabras clave (separadas por coma)</label>
            <input
              id="rec-palabras"
              type="text"
              required
              aria-describedby="rec-palabras-ayuda"
              placeholder="bombero, bomberos, apagafuegos"
              value={palabras}
              onChange={(e) => setPalabras(e.target.value)}
            />
            <span id="rec-palabras-ayuda" className="recetas__ayuda">
              Lo que el cliente podría escribir. Se comparan sin tildes ni mayúsculas, y una palabra no puede estar en
              dos recetas.
            </span>
          </div>

          <div className="field">
            <label htmlFor="rec-descripcion">Descripción (opcional)</label>
            <input
              id="rec-descripcion"
              type="text"
              maxLength={300}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <fieldset className="recetas__huecos">
            <legend>Huecos de la receta ({huecos.length})</legend>
            <p className="recetas__ayuda">
              Cada hueco pide una pieza. «Colores» limita los colores aceptados (vacío = cualquiera) y «El nombre
              contiene» distingue piezas del mismo tipo, por ejemplo un casco de un gorro de chef.
            </p>

            {huecos.map((h, i) => (
              <div key={h.clave} className="recetas__hueco">
                <input
                  type="text"
                  required
                  maxLength={40}
                  aria-label={`Nombre del hueco ${i + 1}`}
                  placeholder="Ej. Casco"
                  value={h.etiqueta}
                  onChange={(e) => cambiarHueco(h.clave, "etiqueta", e.target.value)}
                />
                <select
                  aria-label={`Tipo de prenda del hueco ${i + 1}`}
                  value={h.tipo}
                  onChange={(e) => cambiarHueco(h.clave, "tipo", e.target.value)}
                >
                  {TIPOS_PRENDA.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.etiqueta}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  aria-label={`Colores aceptados del hueco ${i + 1}`}
                  placeholder="Colores: rojo, amarillo"
                  value={h.colores}
                  onChange={(e) => cambiarHueco(h.clave, "colores", e.target.value)}
                />
                <input
                  type="text"
                  aria-label={`El nombre de la pieza contiene, hueco ${i + 1}`}
                  placeholder="El nombre contiene…"
                  value={h.nombreContiene}
                  onChange={(e) => cambiarHueco(h.clave, "nombreContiene", e.target.value)}
                />
                <label className="recetas__obligatoria">
                  <input
                    type="checkbox"
                    checked={h.obligatoria}
                    onChange={(e) => cambiarHueco(h.clave, "obligatoria", e.target.checked)}
                  />
                  Obligatorio
                </label>
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={huecos.length === 1}
                  aria-label={`Quitar el hueco ${i + 1}`}
                  onClick={() => setHuecos((prev) => prev.filter((x) => x.clave !== h.clave))}
                >
                  ×
                </button>
              </div>
            ))}

            <button
              type="button"
              className="btn btn--ghost"
              disabled={huecos.length >= 12}
              onClick={() => setHuecos((prev) => [...prev, nuevoHueco()])}
            >
              + Agregar hueco
            </button>
          </fieldset>

          <label className="recetas__activa">
            <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} />
            Receta activa (los clientes pueden pedirla)
          </label>

          <div className="recetas__acciones">
            <button type="submit" className="btn btn--primary" disabled={guardando}>
              {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Crear receta"}
            </button>
            <button type="button" className="btn btn--ghost" onClick={cerrarFormulario}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <p role="status">Cargando recetas…</p>
      ) : recetas.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Aún no hay recetas. Crea la primera o corre la seed del almacén.</p>
      ) : (
        <ul className="recetas__lista">
          {recetas.map((r) => (
            <li key={r.id} className={`card recetas__item ${r.activa ? "" : "recetas__item--inactiva"}`}>
              <div className="recetas__item-cabecera">
                <div>
                  <h2>{r.nombre}</h2>
                  <span className="recetas__precio">S/ {Number(r.precioDia).toFixed(2)} por día</span>
                </div>
                <div className="recetas__etiquetas">
                  {!r.activa && <span className="recetas__pill recetas__pill--gris">Inactiva</span>}
                  <span className={`recetas__pill ${r.viable ? "recetas__pill--ok" : "recetas__pill--no"}`}>
                    {r.viable ? "Hay stock" : "Sin stock suficiente"}
                  </span>
                </div>
              </div>

              {r.descripcion && <p className="recetas__descripcion">{r.descripcion}</p>}

              <p className="recetas__palabras">
                {r.palabrasClave.map((p) => (
                  <span key={p} className="recetas__chip">
                    {p}
                  </span>
                ))}
              </p>

              <ul className="recetas__piezas">
                {r.piezas.map((p) => (
                  <li key={p.id}>
                    <span>
                      <strong>{p.etiqueta}</strong> · {etiquetaTipo(p.tipo)}
                      {p.colores.length > 0 ? ` · ${p.colores.join(" / ")}` : ""}
                      {p.nombreContiene ? ` · «${p.nombreContiene}»` : ""}
                      {!p.obligatoria ? " · opcional" : ""}
                    </span>
                    <span
                      className={`recetas__stock ${p.stock === 0 && p.obligatoria ? "recetas__stock--cero" : ""}`}
                      title="Piezas disponibles hoy en el almacén para este hueco"
                    >
                      {p.stock} en almacén
                    </span>
                  </li>
                ))}
              </ul>

              <div className="recetas__acciones">
                {confirmandoId === r.id ? (
                  <>
                    <span className="recetas__confirmar">¿Eliminar «{r.nombre}»?</span>
                    <button type="button" className="btn btn--primary" onClick={() => eliminar(r)}>
                      Sí, eliminar
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => setConfirmandoId(null)}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn--ghost" onClick={() => abrirEdicion(r)}>
                      Editar
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => alternarActiva(r)}>
                      {r.activa ? "Desactivar" : "Activar"}
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => setConfirmandoId(r.id)}>
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}