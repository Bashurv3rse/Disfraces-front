import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { iconoPorTipo } from "../../lib/iconos";
import { TIPOS_PRENDA, etiquetaTipo, tallasPermitidas } from "../../lib/prendas";
import "./almacen.css";

interface TallaStock {
  talla: string;
  total: number;
  disponibles: number;
  enUso: number;
  danadas: number;
}

interface GrupoAlmacen {
  clave: string;
  nombre: string;
  tipo: string;
  color: string;
  tallas: TallaStock[];
  totalDisponibles: number;
}

interface RespuestaAlmacen {
  resumen: { total: number; disponibles: number; enUso: number; danadas: number };
  grupos: GrupoAlmacen[];
}

function mensajesDe(err: unknown): string[] {
  const data = (err as { response?: { data?: { mensaje?: string; errores?: Record<string, string[] | undefined> } } })
    ?.response?.data;
  if (data?.mensaje) return [data.mensaje];
  if (data?.errores) {
    const lista = Object.values(data.errores).flatMap((m) => m ?? []);
    if (lista.length) return lista;
  }
  return ["No se pudo completar la acción."];
}

export default function Almacen() {
  const [datos, setDatos] = useState<RespuestaAlmacen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("CAMISA");
  const [color, setColor] = useState("");
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [erroresForm, setErroresForm] = useState<string[]>([]);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get<RespuestaAlmacen>("/almacen");
      setDatos(data);
    } catch (err) {
      setError(mensajesDe(err)[0]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (datos?.grupos ?? []).filter(
      (g) =>
        (!filtroTipo || g.tipo === filtroTipo) &&
        (!q || g.nombre.toLowerCase().includes(q) || g.color.toLowerCase().includes(q))
    );
  }, [datos, busqueda, filtroTipo]);

  async function ejecutar(accion: () => Promise<string>) {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      setAviso(await accion());
      await cargar();
    } catch (err) {
      setError(mensajesDe(err)[0]);
    } finally {
      setOcupado(false);
    }
  }

  const sumar = (g: GrupoAlmacen, talla: string) =>
    ejecutar(async () => {
      await api.post("/almacen/piezas", {
        nombre: g.nombre,
        tipo: g.tipo,
        color: g.color,
        tallas: [{ talla, cantidad: 1 }],
      });
      return `Se agregó 1 unidad de «${g.nombre}» (${talla}).`;
    });

  const quitar = (g: GrupoAlmacen, talla: string) =>
    ejecutar(async () => {
      const { data } = await api.post<{ deBaja: number }>("/almacen/piezas/retirar", {
        nombre: g.nombre,
        tipo: g.tipo,
        color: g.color,
        talla,
        cantidad: 1,
      });
      return data.deBaja > 0
        ? `«${g.nombre}» (${talla}) se dio de baja: tenía historial y no se puede eliminar.`
        : `Se retiró 1 unidad de «${g.nombre}» (${talla}).`;
    });

  async function handleAgregar(e: FormEvent) {
    e.preventDefault();
    setErroresForm([]);

    const tallas = Object.entries(cantidades)
      .map(([talla, c]) => ({ talla, cantidad: Number(c) }))
      .filter((t) => Number.isInteger(t.cantidad) && t.cantidad > 0);

    if (tallas.length === 0) {
      setErroresForm(["Indica la cantidad en al menos una talla."]);
      return;
    }

    setOcupado(true);
    try {
      const { data } = await api.post<{ agregadas: number }>("/almacen/piezas", {
        nombre: nombre.trim(),
        tipo,
        color: color.trim(),
        tallas,
      });
      setAviso(`Se agregaron ${data.agregadas} pieza(s) de «${nombre.trim()}».`);
      setNombre("");
      setColor("");
      setCantidades({});
      setMostrarForm(false);
      await cargar();
    } catch (err) {
      setErroresForm(mensajesDe(err));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="almacen">
      <Link to="/admin/inventario" className="almacen__volver">
        ← Inventario Físico
      </Link>
      <div className="almacen__encabezado">
        <div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Almacén de piezas sueltas</h1>
          <p className="almacen__subtitulo">
            Piezas que no pertenecen a ningún disfraz. Sirven para armar disfraces a medida y como repuestos de los
            disfraces del catálogo.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cancelar" : "+ Agregar piezas"}
        </button>
      </div>

      {datos && (
        <div className="almacen__resumen">
          <div className="almacen__resumen-pill">
            Total <strong>{datos.resumen.total}</strong>
          </div>
          <div className="almacen__resumen-pill">
            Disponibles <strong>{datos.resumen.disponibles}</strong>
          </div>
          <div className="almacen__resumen-pill">
            En uso <strong>{datos.resumen.enUso}</strong>
          </div>
          <div className="almacen__resumen-pill">
            Dañadas / de baja <strong>{datos.resumen.danadas}</strong>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: "var(--space-3)" }}>
          {error}
        </div>
      )}
      {aviso && (
        <p className="almacen__aviso" role="status">
          {aviso}
        </p>
      )}

      {mostrarForm && (
        <form className="card almacen__form" onSubmit={handleAgregar}>
          <h2>Agregar piezas al almacén</h2>
          <p className="almacen__ayuda">
            Para reponer una pieza de un disfraz del catálogo, usa <strong>exactamente su mismo nombre</strong> (por
            ejemplo «Pañuelo de marinera»): así aparecerá como repuesto en «Buscar reemplazo». Si la pieza ya existe,
            las unidades se suman a ella.
          </p>

          {erroresForm.length > 0 && (
            <div className="alert alert--danger" role="alert">
              <ul className="almacen__errores">
                {erroresForm.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="almacen__form-grid">
            <div className="field">
              <label htmlFor="alm-nombre">Nombre de la pieza</label>
              <input
                id="alm-nombre"
                type="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="Ej. Casco rojo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="alm-tipo">Tipo de prenda</label>
              <select
                id="alm-tipo"
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value);
                  setCantidades({});
                }}
              >
                {TIPOS_PRENDA.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="alm-color">Color</label>
              <input
                id="alm-color"
                type="text"
                required
                minLength={2}
                maxLength={30}
                placeholder="Ej. rojo"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>

          <fieldset className="almacen__tallas-form">
            <legend>Unidades por talla</legend>
            <div className="almacen__tallas-grid">
              {tallasPermitidas(tipo).map((t) => (
                <div key={t} className="field almacen__talla-campo">
                  <label htmlFor={`alm-talla-${t}`}>{t}</label>
                  <input
                    id={`alm-talla-${t}`}
                    type="number"
                    min={0}
                    max={50}
                    placeholder="0"
                    value={cantidades[t] ?? ""}
                    onChange={(e) => setCantidades((prev) => ({ ...prev, [t]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="btn btn--primary" disabled={ocupado}>
            {ocupado ? "Guardando…" : "Agregar al almacén"}
          </button>
        </form>
      )}

      <div className="almacen__filtros">
        <div className="field almacen__buscar">
          <label htmlFor="alm-buscar" className="visually-hidden">
            Buscar pieza
          </label>
          <input
            id="alm-buscar"
            type="text"
            placeholder="Buscar por nombre o color…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="alm-filtro-tipo" className="visually-hidden">
            Filtrar por tipo
          </label>
          <select id="alm-filtro-tipo" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {TIPOS_PRENDA.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      {cargando ? (
        <p role="status">Cargando almacén…</p>
      ) : grupos.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>
          {datos && datos.grupos.length === 0
            ? "El almacén está vacío. Agrega piezas o corre la seed del almacén."
            : "No hay piezas que coincidan con ese filtro."}
        </p>
      ) : (
        <ul className="almacen__lista">
          {grupos.map((g) => (
            <li key={g.clave} className="card almacen__grupo">
              <div className="almacen__grupo-cabecera">
                <span className="almacen__icono" aria-hidden="true">
                  {iconoPorTipo(g.tipo)}
                </span>
                <div>
                  <strong>{g.nombre}</strong>
                  <span className="almacen__meta">
                    {etiquetaTipo(g.tipo)} · {g.color}
                  </span>
                </div>
                <span className="almacen__total">{g.totalDisponibles} disponibles</span>
              </div>

              <div className="almacen__tallas">
                {g.tallas.map((t) => (
                  <div key={t.talla} className="almacen__talla">
                    <span className="almacen__talla-nombre">{t.talla}</span>
                    <div className="almacen__stepper">
                      <button
                        type="button"
                        aria-label={`Retirar una unidad de ${g.nombre}, talla ${t.talla}`}
                        disabled={ocupado || t.disponibles + t.danadas === 0}
                        onClick={() => quitar(g, t.talla)}
                      >
                        −
                      </button>
                      <strong aria-label={`${t.disponibles} disponibles`}>{t.disponibles}</strong>
                      <button
                        type="button"
                        aria-label={`Agregar una unidad de ${g.nombre}, talla ${t.talla}`}
                        disabled={ocupado}
                        onClick={() => sumar(g, t.talla)}
                      >
                        +
                      </button>
                    </div>
                    {(t.enUso > 0 || t.danadas > 0) && (
                      <span className="almacen__talla-nota">
                        {t.enUso > 0 ? `${t.enUso} en uso` : ""}
                        {t.enUso > 0 && t.danadas > 0 ? " · " : ""}
                        {t.danadas > 0 ? `${t.danadas} dañada(s)` : ""}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}