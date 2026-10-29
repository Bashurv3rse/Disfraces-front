import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import "./pedidos-a-medida.css";

type FaseLavado = "LAVADO" | "PLANCHADO" | "EMPAQUETADO" | null;

interface GrupoDemanda {
  textoNormalizado: string;
  veces: number;
  personas: number;
  primera: string;
  ultima: string;
  ejemplos: string[];
}

interface RespuestaDemanda {
  grupos: GrupoDemanda[];
  resumen: {
    pedidosPendientes: number;
    gruposPendientes: number;
    totalPedidos: number;
    conReceta: number;
    atendidosSinReceta: number;
  };
  truncado: boolean;
}

interface PiezaEnCurso {
  id: string;
  nombre: string;
  estado: "DISPONIBLE" | "DANADA" | "FALTANTE";
  procedencia: string | null;
  talla: string;
}

interface ReservaEnCurso {
  reservaId: string;
  confirmadaEn: string | null;
  disfraz: { id: string; nombre: string };
  estado: "ALQUILADO" | "EN_LAVADO" | "POR_DESARMAR";
  cliente: { nombre: string; email: string } | null;
  alquiler: { id: string; estado: string; fechaInicio: string | null; fechaFin: string | null } | null;
  lavado: { dias: number; fase: FaseLavado; liberaEl: string } | null;
  piezas: PiezaEnCurso[];
  tipo: "A_MEDIDA" | "AJUSTE_TALLA";
}

const FASE: Record<string, string> = {
  LAVADO: "Lavado (día 1/3)",
  PLANCHADO: "Planchado (día 2/3)",
  EMPAQUETADO: "Empaquetado (día 3/3)",
};

const ESTADO: Record<ReservaEnCurso["estado"], { texto: string; clase: string }> = {
  ALQUILADO: { texto: "Alquilado", clase: "alquilado" },
  EN_LAVADO: { texto: "En lavado", clase: "lavado" },
  POR_DESARMAR: { texto: "Por desarmar", clase: "desarmar" },
};

function mensajeDe(err: unknown, porDefecto = "No se pudo completar la acción."): string {
  return (err as { response?: { data?: { mensaje?: string } } })?.response?.data?.mensaje || porDefecto;
}

// Las fechas de alquiler se guardan a medianoche UTC: se muestran en UTC para no retroceder un día en Lima.
const fechaUTC = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-PE", { timeZone: "UTC" }) : "—");
const fechaLocal = (iso: string) => new Date(iso).toLocaleDateString("es-PE");
const titulo = (t: string) =>
  t
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
const procedenciaDe = (p: string | null) => (!p ? "—" : p.startsWith("Almacén") ? "Almacén" : p);

function pasoLaFechaFin(fin: string | null): boolean {
  if (!fin) return false;
  const h = new Date();
  return new Date(fin) < new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), h.getUTCDate()));
}

export default function PedidosAMedida() {
  const navigate = useNavigate();
  const [pestana, setPestana] = useState<"PEDIDOS" | "EN_CURSO">("PEDIDOS");
  const [demanda, setDemanda] = useState<RespuestaDemanda | null>(null);
  const [enCurso, setEnCurso] = useState<ReservaEnCurso[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([
        api.get<RespuestaDemanda>("/a-medida/admin/demanda"),
        api.get<ReservaEnCurso[]>("/a-medida/admin/en-curso"),
      ]);
      setDemanda(d.data);
      setEnCurso(c.data);
      setError(null);
    } catch (err) {
      setError(mensajeDe(err, "No se pudieron cargar los datos."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function crearReceta(g: GrupoDemanda) {
    navigate("/admin/recetas", {
      state: { prellenar: { nombre: titulo(g.textoNormalizado), palabrasClave: g.textoNormalizado } },
    });
  }

  async function marcarAtendido(g: GrupoDemanda) {
    setProcesando(g.textoNormalizado);
    setError(null);
    setAviso(null);
    try {
      const { data } = await api.post<{ marcados: number }>("/a-medida/admin/demanda/atendida", {
        textoNormalizado: g.textoNormalizado,
      });
      setAviso(`Se marcaron ${data.marcados} pedido(s) de «${g.textoNormalizado}» como atendidos.`);
      await cargar();
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setConfirmando(null);
      setProcesando(null);
    }
  }

  const grupos = demanda?.grupos ?? [];
  const reservas = enCurso ?? [];

  return (
    <div className="pedidos">
      <Link to="/admin/inventario" className="pedidos__volver">
        ← Inventario Físico
      </Link>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Disfraces a medida</h1>
      <p className="pedidos__subtitulo">
        Lo que los clientes piden y todavía no tiene receta, y los disfraces a medida que están alquilados o en lavado.
        Al terminar el lavado, las piezas vuelven solas a su lugar.
      </p>

      {demanda && (
        <div className="pedidos__resumen">
          <div className="pedidos__pill">
            Pedidos sin atender <strong>{demanda.resumen.pedidosPendientes}</strong>
          </div>
          <div className="pedidos__pill">
            Atendidos con receta <strong>{demanda.resumen.conReceta}</strong>
          </div>
          <div className="pedidos__pill">
            En curso <strong>{reservas.length}</strong>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: "var(--space-3)" }}>
          {error}
        </div>
      )}
      {aviso && (
        <p className="pedidos__aviso" role="status">
          {aviso}
        </p>
      )}

      <div className="pedidos__tabs" role="tablist" aria-label="Secciones">
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "PEDIDOS"}
          className={`pedidos__tab ${pestana === "PEDIDOS" ? "pedidos__tab--activa" : ""}`}
          onClick={() => setPestana("PEDIDOS")}
        >
          Pedidos sin receta ({grupos.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "EN_CURSO"}
          className={`pedidos__tab ${pestana === "EN_CURSO" ? "pedidos__tab--activa" : ""}`}
          onClick={() => setPestana("EN_CURSO")}
        >
          En curso ({reservas.length})
        </button>
      </div>

      {cargando ? (
        <p role="status">Cargando…</p>
      ) : pestana === "PEDIDOS" ? (
        <>
          {demanda?.truncado && (
            <p className="pedidos__nota">Se muestran los 2000 pedidos más recientes; puede haber más antiguos sin contar.</p>
          )}
          {grupos.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>
              No hay pedidos pendientes. Cuando un cliente pida algo sin receta, aparecerá aquí.
            </p>
          ) : (
            <ul className="pedidos__lista">
              {grupos.map((g) => (
                <li key={g.textoNormalizado} className="card pedidos__item">
                  <div className="pedidos__cabecera">
                    <h2>«{g.textoNormalizado}»</h2>
                    <span className="pedidos__cuenta">
                      {g.veces} pedido{g.veces === 1 ? "" : "s"} · {g.personas} persona{g.personas === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="pedidos__meta">
                    Primero: {fechaLocal(g.primera)} · último: {fechaLocal(g.ultima)}
                  </p>
                  {g.ejemplos.length > 0 && (
                    <p className="pedidos__ejemplos">
                      {g.ejemplos.map((e) => (
                        <span key={e} className="pedidos__chip">
                          {e}
                        </span>
                      ))}
                    </p>
                  )}

                  <div className="pedidos__acciones">
                    {confirmando === g.textoNormalizado ? (
                      <>
                        <span className="pedidos__confirmar">¿Marcar como atendido sin crear receta?</span>
                        <button
                          type="button"
                          className="btn btn--primary"
                          disabled={procesando === g.textoNormalizado}
                          onClick={() => marcarAtendido(g)}
                        >
                          Sí, marcar
                        </button>
                        <button type="button" className="btn btn--ghost" onClick={() => setConfirmando(null)}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="btn btn--primary" onClick={() => crearReceta(g)}>
                          Crear receta
                        </button>
                        <button type="button" className="btn btn--ghost" onClick={() => setConfirmando(g.textoNormalizado)}>
                          Marcar como atendido
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : reservas.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No hay disfraces a medida alquilados ni en lavado ahora mismo.</p>
      ) : (
        <ul className="pedidos__lista">
          {reservas.map((r) => {
            const est = ESTADO[r.estado];
            const vencido = r.estado === "ALQUILADO" && pasoLaFechaFin(r.alquiler?.fechaFin ?? null);
            return (
              <li key={r.reservaId} className="card pedidos__item">
                <div className="pedidos__cabecera">
                  <div>
                    <h2>{r.disfraz.nombre}</h2>
                    <span className="pedidos__tipo">{r.tipo === "AJUSTE_TALLA" ? "Ajuste de talla" : "A medida"}</span>
                  </div>
                  <span className={`pedidos__estado pedidos__estado--${est.clase}`}>{est.texto}</span>
                </div>

                {r.cliente && (
                  <p className="pedidos__meta">
                    {r.cliente.nombre} · {r.cliente.email}
                  </p>
                )}
                {r.alquiler && (
                  <p className="pedidos__meta">
                    Del {fechaUTC(r.alquiler.fechaInicio)} al {fechaUTC(r.alquiler.fechaFin)}
                  </p>
                )}
                {vencido && (
                  <p className="pedidos__vencido">⚠ Pasó la fecha de fin y todavía no se devuelve.</p>
                )}
                {r.lavado && (
                  <p className="pedidos__lavado">
                    {r.lavado.fase ? FASE[r.lavado.fase] : "Terminando el lavado"} · se desarma el{" "}
                    {fechaUTC(r.lavado.liberaEl)}
                  </p>
                )}
                {r.estado === "POR_DESARMAR" && (
                  <p className="pedidos__lavado">Lavado terminado: se desarma la próxima vez que alguien consulte el sistema.</p>
                )}
                {r.tipo === "AJUSTE_TALLA" && (
                  <p className="pedidos__meta">
                    Estas piezas entraron por el ajuste de talla. Al desarmar vuelven a su origen y las originales regresan al disfraz.
                  </p>
                )}
                <ul className="pedidos__piezas">
                  {r.piezas.map((p) => (
                    <li key={p.id}>
                      <span>
                        {p.nombre}
                        <span className="pedidos__origen"> · talla {p.talla} · vuelve a: {procedenciaDe(p.procedencia)}</span>
                      </span>
                      {p.estado !== "DISPONIBLE" && (
                        <span className="pedidos__pieza-mala">{p.estado === "DANADA" ? "Dañada" : "Faltante"}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}