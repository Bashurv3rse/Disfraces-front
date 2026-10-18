import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import "./crear-disfraz.css";

const TIPOS_PRENDA = [
  { valor: "SOMBRERO", etiqueta: "Sombrero" },
  { valor: "CAMISA", etiqueta: "Camisa / polo" },
  { valor: "PANTALON", etiqueta: "Pantalón" },
  { valor: "FALDA", etiqueta: "Falda" },
  { valor: "ZAPATO", etiqueta: "Zapato" },
  { valor: "ABRIGO", etiqueta: "Abrigo / capa" },
  { valor: "CHALECO", etiqueta: "Chaleco" },
  { valor: "ACCESORIO", etiqueta: "Accesorio" },
  { valor: "PANUELO", etiqueta: "Pañuelo" },
  { valor: "TACON", etiqueta: "Tacón" },
];

interface PrendaForm {
  clave: number;
  nombre: string;
  tipo: string;
  color: string;
  talla: string;
}

interface PrendaBase {
  nombre: string;
  tipo: string;
  color: string;
  talla: string;
}

interface DisfrazExistente {
  id: string;
  nombre: string;
  familia: string | null;
  grupoCompatibilidad: string | null;
  tipoDisfraz: string;
  temporadaEvento: string;
  precioAlquiler: string;
  imagenUrl: string | null;
  prendasHogar: PrendaBase[];
}

interface FamiliaResumen {
  clave: string;
  nombre: string;
  grupo: string | null;
  tipoDisfraz: string;
  temporada: string;
  precio: string;
  imagenUrl: string | null;
  prendas: PrendaBase[];
  siguienteNumero: number;
}

interface DisfrazCreado {
  id: string;
  nombre: string;
  familia: string | null;
  grupoCompatibilidad: string | null;
  tipoDisfraz: string;
  temporadaEvento: string;
  precioAlquiler: string;
  imagenUrl: string | null;
  estado: string;
}

interface Resultado {
  disfraz: DisfrazCreado;
  prendas: { nombre: string; tipo: string; color: string }[];
  esFamiliaNueva: boolean;
}

function aSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function familiaDeNombre(nombre: string): string {
  return nombre.replace(/\s*#\d+\s*$/, "").trim() || nombre.trim();
}

function mensajesDe(err: unknown): string[] {
  const data = (err as { response?: { data?: { mensaje?: string; errores?: Record<string, string[] | undefined> } } })
    ?.response?.data;
  if (data?.mensaje) return [data.mensaje];
  if (data?.errores) {
    const lista = Object.entries(data.errores).flatMap(([campo, msgs]) => (msgs ?? []).map((t) => `${campo}: ${t}`));
    if (lista.length) return lista;
  }
  return ["No se pudo crear el disfraz."];
}

// Bloque listo para pegar dentro del arreglo `familias` de backend/prisma/seed.ts.
function bloqueSeed(r: Resultado): string {
  const d = r.disfraz;
  const familia = d.familia ?? d.nombre;
  return [
    "  {",
    `    nombre: ${JSON.stringify(familia)},`,
    `    grupo: ${JSON.stringify(d.grupoCompatibilidad ?? aSlug(familia))},`,
    `    tipoDisfraz: ${JSON.stringify(d.tipoDisfraz)},`,
    `    temporadaEvento: ${JSON.stringify(d.temporadaEvento)},`,
    `    precioAlquiler: ${Number(d.precioAlquiler).toFixed(2)},`,
    `    imagenUrl: ${JSON.stringify(d.imagenUrl ?? "")},`,
    "    prendas: [",
    ...r.prendas.map(
      (p) =>
        `      { nombre: ${JSON.stringify(p.nombre)}, tipo: ${JSON.stringify(p.tipo)}, color: ${JSON.stringify(p.color)} },`
    ),
    "    ],",
    "  },",
  ].join("\n");
}

export default function CrearDisfraz() {
  const contador = useRef(0);
  const nuevaPrenda = (datos: Partial<PrendaForm> = {}): PrendaForm => ({
    clave: ++contador.current,
    nombre: "",
    tipo: "CAMISA",
    color: "",
    talla: "",
    ...datos,
  });

  const [existentes, setExistentes] = useState<DisfrazExistente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [baseClave, setBaseClave] = useState("");
  const [nombre, setNombre] = useState("");
  const [familia, setFamilia] = useState("");
  const [grupo, setGrupo] = useState("");
  const [tipoDisfraz, setTipoDisfraz] = useState("");
  const [temporada, setTemporada] = useState("");
  const [precio, setPrecio] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [imagenRota, setImagenRota] = useState(false);
  const [prendas, setPrendas] = useState<PrendaForm[]>(() => [nuevaPrenda()]);

  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cargarExistentes = useCallback(async () => {
    try {
      const { data } = await api.get<DisfrazExistente[]>("/disfraces");
      setExistentes(data);
      setErrorCarga(null);
    } catch {
      setErrorCarga("No se pudieron cargar las familias existentes. Puedes crear el disfraz igualmente.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarExistentes();
  }, [cargarExistentes]);

  const familias = useMemo<FamiliaResumen[]>(() => {
    const mapa = new Map<string, DisfrazExistente[]>();
    for (const d of existentes) {
      if (!d.familia) continue;
      const clave = d.familia.toLowerCase();
      mapa.set(clave, [...(mapa.get(clave) ?? []), d]);
    }
    return Array.from(mapa.entries())
      .map(([clave, lista]) => {
        const base = lista[0];
        const numeros = lista.map((d) => Number(/#(\d+)\s*$/.exec(d.nombre)?.[1] ?? 0));
        return {
          clave,
          nombre: base.familia as string,
          grupo: base.grupoCompatibilidad,
          tipoDisfraz: base.tipoDisfraz,
          temporada: base.temporadaEvento,
          precio: base.precioAlquiler,
          imagenUrl: base.imagenUrl,
          prendas: base.prendasHogar,
          siguienteNumero: Math.max(0, ...numeros) + 1,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [existentes]);

  const grupos = useMemo(
    () => Array.from(new Set(existentes.map((d) => d.grupoCompatibilidad).filter(Boolean) as string[])).sort(),
    [existentes]
  );
  const tipos = useMemo(() => Array.from(new Set(existentes.map((d) => d.tipoDisfraz))).sort(), [existentes]);
  const temporadas = useMemo(() => Array.from(new Set(existentes.map((d) => d.temporadaEvento))).sort(), [existentes]);

  const familiaEfectiva = familia.trim() || familiaDeNombre(nombre);
  const familiaExistente = familias.find((f) => f.clave === familiaEfectiva.toLowerCase());

  const ayudaGrupo = familiaExistente
    ? familiaExistente.grupo
      ? `Esta familia ya existe y pertenece al grupo «${familiaExistente.grupo}». Si lo dejas vacío, se usará ese.`
      : "Esta familia ya existe pero no tiene grupo."
    : familiaEfectiva
    ? `Si lo dejas vacío, será un grupo propio: «${aSlug(familiaEfectiva) || "…"}». Solo se intercambian piezas dentro del mismo grupo.`
    : "Solo se intercambian piezas entre disfraces del mismo grupo.";

  function aplicarBase(clave: string) {
    setBaseClave(clave);
    const f = familias.find((x) => x.clave === clave);
    if (!f) return;
    setFamilia(f.nombre);
    setGrupo(f.grupo ?? "");
    setTipoDisfraz(f.tipoDisfraz);
    setTemporada(f.temporada);
    setPrecio(String(Number(f.precio)));
    setImagenUrl(f.imagenUrl ?? "");
    setImagenRota(false);
    setNombre(`${f.nombre} #${f.siguienteNumero}`);
    setPrendas(
      f.prendas.length
        ? f.prendas.map((p) => nuevaPrenda({ nombre: p.nombre, tipo: p.tipo, color: p.color, talla: p.talla }))
        : [nuevaPrenda()]
    );
  }

  function cambiarPrenda(clave: number, campo: "nombre" | "tipo" | "color" | "talla", valor: string) {
    setPrendas((prev) => prev.map((p) => (p.clave === clave ? { ...p, [campo]: valor } : p)));
  }

  function quitarPrenda(clave: number) {
    setPrendas((prev) => (prev.length > 1 ? prev.filter((p) => p.clave !== clave) : prev));
  }

  function limpiarFormulario() {
    setBaseClave("");
    setNombre("");
    setFamilia("");
    setGrupo("");
    setTipoDisfraz("");
    setTemporada("");
    setPrecio("");
    setImagenUrl("");
    setImagenRota(false);
    setPrendas([nuevaPrenda()]);
    setErrores([]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrores([]);

    const prendasLimpias = prendas.map((p) => ({
      nombre: p.nombre.trim(),
      tipo: p.tipo,
      color: p.color.trim(),
      talla: p.talla.trim(),
    }));

    const cuerpo: Record<string, unknown> = {
      nombre: nombre.trim(),
      tipoDisfraz: tipoDisfraz.trim(),
      temporadaEvento: temporada.trim(),
      precioAlquiler: Number(precio),
      prendas: prendasLimpias,
    };
    if (familia.trim()) cuerpo.familia = familia.trim();
    const grupoLimpio = aSlug(grupo);
    if (grupoLimpio) cuerpo.grupoCompatibilidad = grupoLimpio;
    if (imagenUrl.trim()) cuerpo.imagenUrl = imagenUrl.trim();

    // Se decide antes de crear: después ya existiría la familia.
    const esFamiliaNueva = !familias.some((f) => f.clave === familiaEfectiva.toLowerCase());

    setEnviando(true);
    try {
      const { data } = await api.post<DisfrazCreado>("/disfraces", cuerpo);
      setResultado({
        disfraz: data,
        prendas: prendasLimpias.map(({ nombre: n, tipo, color }) => ({ nombre: n, tipo, color })),
        esFamiliaNueva,
      });
      setCopiado(false);
    } catch (err) {
      setErrores(mensajesDe(err));
    } finally {
      setEnviando(false);
    }
  }

  async function copiarBloque(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  function crearOtro() {
    setResultado(null);
    limpiarFormulario();
    cargarExistentes();
  }

  if (resultado) {
    const bloque = resultado.esFamiliaNueva ? bloqueSeed(resultado) : null;
    return (
      <div className="crear">
        <div className="card crear__exito">
          <h1>Disfraz creado</h1>
          <p>
            <strong>{resultado.disfraz.nombre}</strong> quedó registrado con {resultado.prendas.length} prenda(s). Familia:{" "}
            <strong>{resultado.disfraz.familia}</strong> · grupo: <strong>{resultado.disfraz.grupoCompatibilidad}</strong> ·
            estado: <strong>{resultado.disfraz.estado}</strong>.
          </p>

          <div className="crear__acciones">
            <Link to="/admin/inventario" className="btn btn--primary">
              Ver en Inventario Físico
            </Link>
            <button type="button" className="btn btn--ghost" onClick={crearOtro}>
              Crear otro disfraz
            </button>
          </div>

          <h2>¿Y la seed?</h2>
          {bloque ? (
            <>
              <p className="crear__nota">
                Este disfraz vive solo en la base de datos: si vuelves a correr <code>npx prisma db seed</code>, desaparece.
                Para conservarlo, pega este bloque dentro del arreglo <code>familias</code> de{" "}
                <code>backend/prisma/seed.ts</code>. La seed generará 3 instancias (#1 a #3) con tallas estándar; las tallas
                que escribiste aquí no se copian.
              </p>
              <pre className="crear__codigo">{bloque}</pre>
              <button type="button" className="btn btn--ghost" onClick={() => copiarBloque(bloque)}>
                {copiado ? "¡Copiado!" : "Copiar bloque"}
              </button>
            </>
          ) : (
            <p className="crear__nota">
              Esta familia ya existe en el inventario. La seed genera exactamente 3 instancias por familia, así que esta
              instancia extra solo vive en la base de datos: si vuelves a correr la seed, desaparece.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="crear">
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Nuevo disfraz</h1>
      <p className="crear__subtitulo">
        Registra una unidad física con sus prendas. Para sumar otra instancia de una familia que ya existe, empieza por
        «Basar en una familia existente».
      </p>

      {errorCarga && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: "var(--space-3)" }}>
          {errorCarga}
        </div>
      )}

      <form className="card crear__form" onSubmit={handleSubmit}>
        {errores.length > 0 && (
          <div className="alert alert--danger" role="alert">
            <ul className="crear__errores">
              {errores.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="field">
          <label htmlFor="cd-base">Basar en una familia existente (opcional)</label>
          <select id="cd-base" value={baseClave} disabled={cargando} onChange={(e) => aplicarBase(e.target.value)}>
            <option value="">— Empezar en blanco —</option>
            {familias.map((f) => (
              <option key={f.clave} value={f.clave}>
                {f.nombre} ({f.siguienteNumero - 1} instancia{f.siguienteNumero - 1 === 1 ? "" : "s"})
              </option>
            ))}
          </select>
        </div>

        <div className="crear__grid">
          <div className="field">
            <label htmlFor="cd-nombre">Nombre de este disfraz</label>
            <input
              id="cd-nombre"
              type="text"
              required
              minLength={2}
              placeholder="Ej. Marinera Peruana #4"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="cd-familia">Familia</label>
            <input
              id="cd-familia"
              type="text"
              list="cd-lista-familias"
              placeholder={nombre ? familiaDeNombre(nombre) : "Ej. Marinera Peruana"}
              value={familia}
              onChange={(e) => setFamilia(e.target.value)}
            />
            <datalist id="cd-lista-familias">
              {familias.map((f) => (
                <option key={f.clave} value={f.nombre} />
              ))}
            </datalist>
          </div>

          <div className="field">
            <label htmlFor="cd-tipo">Tipo de disfraz</label>
            <input
              id="cd-tipo"
              type="text"
              required
              list="cd-lista-tipos"
              placeholder="Ej. Marinera"
              value={tipoDisfraz}
              onChange={(e) => setTipoDisfraz(e.target.value)}
            />
            <datalist id="cd-lista-tipos">
              {tipos.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <div className="field">
            <label htmlFor="cd-temporada">Temporada o evento</label>
            <input
              id="cd-temporada"
              type="text"
              required
              list="cd-lista-temporadas"
              placeholder="Ej. halloween"
              value={temporada}
              onChange={(e) => setTemporada(e.target.value)}
            />
            <datalist id="cd-lista-temporadas">
              {temporadas.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <div className="field">
            <label htmlFor="cd-precio">Precio por día (S/)</label>
            <input
              id="cd-precio"
              type="number"
              required
              min="1"
              step="0.5"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="cd-grupo">Grupo de compatibilidad</label>
            <input
              id="cd-grupo"
              type="text"
              list="cd-lista-grupos"
              aria-describedby="cd-grupo-ayuda"
              placeholder="Ej. capa-halloween"
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
              onBlur={() => setGrupo((g) => aSlug(g))}
            />
            <datalist id="cd-lista-grupos">
              {grupos.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <span id="cd-grupo-ayuda" className="crear__ayuda">
              {ayudaGrupo}
            </span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="cd-imagen">Imagen (opcional)</label>
          <input
            id="cd-imagen"
            type="text"
            aria-describedby="cd-imagen-ayuda"
            placeholder="/disfraces-img/mi-disfraz.jpg  o  https://…"
            value={imagenUrl}
            onChange={(e) => {
              setImagenUrl(e.target.value);
              setImagenRota(false);
            }}
          />
          <span id="cd-imagen-ayuda" className="crear__ayuda">
            No se suben archivos: indica una URL permanente, o una ruta que ya exista en frontend/public/disfraces-img/. Sin
            imagen, el catálogo muestra el ícono de la temporada.
          </span>
          {imagenUrl.trim() && !imagenRota && (
            <img
              className="crear__preview"
              src={imagenUrl.trim()}
              alt="Vista previa de la imagen"
              onError={() => setImagenRota(true)}
            />
          )}
          {imagenUrl.trim() && imagenRota && (
            <span className="crear__ayuda crear__ayuda--alerta">No se pudo cargar esa imagen: revisa la ruta o la URL.</span>
          )}
        </div>

        <fieldset className="crear__prendas">
          <legend>Prendas ({prendas.length})</legend>
          <div className="crear__prendas-cabecera" aria-hidden="true">
            <span>Nombre</span>
            <span>Tipo</span>
            <span>Color</span>
            <span>Talla</span>
            <span />
          </div>

          {prendas.map((p, i) => (
            <div key={p.clave} className="crear__prenda">
              <input
                type="text"
                required
                aria-label={`Nombre de la prenda ${i + 1}`}
                placeholder="Ej. Pañuelo de marinera"
                value={p.nombre}
                onChange={(e) => cambiarPrenda(p.clave, "nombre", e.target.value)}
              />
              <select
                aria-label={`Tipo de la prenda ${i + 1}`}
                value={p.tipo}
                onChange={(e) => cambiarPrenda(p.clave, "tipo", e.target.value)}
              >
                {TIPOS_PRENDA.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                aria-label={`Color de la prenda ${i + 1}`}
                placeholder="Ej. blanco"
                value={p.color}
                onChange={(e) => cambiarPrenda(p.clave, "color", e.target.value)}
              />
              <input
                type="text"
                required
                aria-label={`Talla de la prenda ${i + 1}`}
                placeholder="S, M, L, 38, única…"
                value={p.talla}
                onChange={(e) => cambiarPrenda(p.clave, "talla", e.target.value)}
              />
              <button
                type="button"
                className="btn btn--ghost"
                disabled={prendas.length === 1}
                aria-label={`Quitar la prenda ${i + 1}`}
                onClick={() => quitarPrenda(p.clave)}
              >
                ×
              </button>
            </div>
          ))}

          <button
            type="button"
            className="btn btn--ghost"
            disabled={prendas.length >= 20}
            onClick={() => setPrendas((prev) => [...prev, nuevaPrenda()])}
          >
            + Agregar prenda
          </button>
        </fieldset>

        <div className="crear__acciones">
          <button type="submit" className="btn btn--primary" disabled={enviando}>
            {enviando ? "Creando…" : "Crear disfraz"}
          </button>
          <Link to="/admin/inventario" className="btn btn--ghost">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}