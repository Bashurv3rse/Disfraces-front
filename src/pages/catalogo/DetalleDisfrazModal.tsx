import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { CalendarioDisponibilidad } from "../../components/CalendarioDisponibilidad";
import { colorPorSemilla, iconoPorTemporada } from "../../lib/iconos";
import { categoriaTalla, etiquetaTipo } from "../../lib/prendas";
import { bloqueoDe, estaDisponible, opcionesDeTalla, tallaDe, variantePara } from "../../lib/agruparDisfraces";
import type { DisfrazCat, GrupoDisfraz } from "../../lib/agruparDisfraces";

const ETIQUETA_BLOQUEO: Record<string, string> = {
  EN_REPARACION: "En reparación",
  INCOMPLETO: "Incompleto (le faltan piezas)",
  RESERVADO: "Reservado por otra persona",
};

interface Props {
  grupo: GrupoDisfraz;
  sesionIniciada: boolean;
  idsEnCarrito: string[];
  onAgregar: (d: DisfrazCat) => void;
  onCerrar: () => void;
}

export function DetalleDisfrazModal({ grupo, sesionIniciada, idsEnCarrito, onAgregar, onCerrar }: Props) {
  const [imagenFallida, setImagenFallida] = useState(false);
  const [verCalendario, setVerCalendario] = useState(false);
  const [desdePerfil, setDesdePerfil] = useState(false);

  const inicial = grupo.representante;
  const [ropa, setRopa] = useState<string>(tallaDe(inicial, "ROPA") ?? "");
  const [calzado, setCalzado] = useState<string>(tallaDe(inicial, "CALZADO") ?? "");

  const hayRopa = useMemo(() => opcionesDeTalla(grupo, null, null).ropas.length > 0, [grupo]);
  // Las dos tallas se eligen por separado: cada una muestra todas sus opciones.
  const { ropas: tallasRopa, calzados: tallasCalzado } = useMemo(() => opcionesDeTalla(grupo, null, null), [grupo]);

  // Si el cliente guardó sus tallas en su perfil, el detalle se abre ya con ellas elegidas.
  useEffect(() => {
    if (!sesionIniciada) return;
    let vigente = true;
    (async () => {
      try {
        const { data } = await api.get("/auth/perfil");
        const perfilRopa: string | null | undefined = data?.usuario?.tallaRopa;
        const perfilCalzado: string | null | undefined = data?.usuario?.tallaCalzado;
        if (!vigente) return;
        const ropaOk = !!perfilRopa && tallasRopa.includes(perfilRopa);
        const calzadoOk = !!perfilCalzado && tallasCalzado.includes(perfilCalzado);
        if (ropaOk) setRopa(perfilRopa!);
        if (calzadoOk) setCalzado(perfilCalzado!);
        if (ropaOk || calzadoOk) setDesdePerfil(true);
      } catch {
        // Sin perfil se queda con la primera talla: no es un error para el cliente.
      }
    })();
    return () => {
      vigente = false;
    };
    // Solo al abrir el detalle: no debe pisar lo que el cliente cambie después.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [onCerrar]);

  const variante = variantePara(grupo, hayRopa ? ropa : null, tallasCalzado.length ? calzado : null);
  const bloqueo = variante ? bloqueoDe(variante) : null;
  const disponibleHoy = !!variante && estaDisponible(variante);
  const enCarrito = !!variante && idsEnCarrito.includes(variante.id);
  // Un alquiler en otras fechas no impide agregarlo: las fechas se eligen y validan en el carrito.
  const puedeAgregar = !!variante && !bloqueo && !enCarrito;
  const mostrada = variante ?? inicial;
  const colores = Array.from(new Set(mostrada.prendasHogar.map((p) => p.color)));

  let estadoTexto = "No hay esa combinación de tallas";
  let estadoOk = false;
  if (variante) {
    if (bloqueo) estadoTexto = ETIQUETA_BLOQUEO[bloqueo];
    else if (disponibleHoy) {
      estadoTexto = "Disponible";
      estadoOk = true;
    } else {
      estadoTexto = "Ocupado hoy: mira otras fechas en el calendario";
    }
  }

  return (
    <div className="detalle-overlay" onClick={onCerrar}>
      <div className="detalle" role="dialog" aria-modal="true" aria-labelledby="detalle-titulo" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="detalle__cerrar" aria-label="Cerrar detalle" onClick={onCerrar}>
          ×
        </button>

        <div className="detalle__imagen">
          {inicial.imagenUrl && !imagenFallida ? (
            <img src={inicial.imagenUrl} alt={grupo.nombre} onError={() => setImagenFallida(true)} />
          ) : (
            <div className="catalogo__imagen detalle__placeholder" style={{ background: colorPorSemilla(inicial.temporadaEvento) }} aria-hidden="true">
              <span className="catalogo__icono">{iconoPorTemporada(inicial.temporadaEvento)}</span>
            </div>
          )}
        </div>

        <div className="detalle__cuerpo">
          <h2 id="detalle-titulo">{grupo.nombre}</h2>
          <p className="catalogo__meta">
            {inicial.tipoDisfraz} · Temporada: {inicial.temporadaEvento}
          </p>
          <p className="catalogo__precio">S/ {inicial.precioAlquiler} / día</p>

          <div className="detalle__tallas">
            {tallasRopa.length > 0 && (
              <div className="field">
                <label htmlFor="detalle-talla-ropa">Talla de ropa</label>
                <select id="detalle-talla-ropa" value={ropa} onChange={(e) => setRopa(e.target.value)}>
                  {tallasRopa.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
            {tallasCalzado.length > 0 && (
              <div className="field">
                <label htmlFor="detalle-talla-calzado">Talla de calzado</label>
                <select id="detalle-talla-calzado" value={calzado} onChange={(e) => setCalzado(e.target.value)}>
                  {tallasCalzado.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {desdePerfil && <p className="catalogo__ayuda">Elegimos las tallas que guardaste en tu perfil. Puedes cambiarlas.</p>}

          <p>
            Disponibilidad:{" "}
            <span className={`catalogo__estado ${estadoOk ? "catalogo__estado--ok" : "catalogo__estado--incompleto"}`}>{estadoTexto}</span>
          </p>

          {variante && (
            <>
              <button type="button" className="btn btn--ghost detalle__ver-disp" aria-expanded={verCalendario} onClick={() => setVerCalendario((v) => !v)}>
                {verCalendario ? "Ocultar disponibilidad" : "Ver disponibilidad"}
              </button>
              {verCalendario && (
                <CalendarioDisponibilidad key={variante.id} ocupaciones={variante.ocupaciones ?? []} bloqueo={bloqueo} />
              )}
            </>
          )}

          {colores.length > 0 && <p className="detalle__colores">Colores: {colores.join(", ")}</p>}

          <h3 style={{ fontSize: "0.95rem" }}>Piezas que lo componen</h3>
          <ul className="catalogo__prendas">
            {mostrada.prendasHogar.map((p) => (
              <li key={p.id}>
                {p.nombre} · {etiquetaTipo(p.tipo)} · {p.color} · {categoriaTalla(p.tipo) === "UNICA" ? "talla única" : `talla ${p.talla}`}
              </li>
            ))}
          </ul>

          <div className="detalle__acciones">
            {sesionIniciada ? (
              <button type="button" className="btn btn--primary" disabled={!puedeAgregar} onClick={() => variante && onAgregar(variante)}>
                {enCarrito ? "En el carrito" : "Agregar al carrito"}
              </button>
            ) : (
              <Link to="/login" className="btn btn--ghost">Inicia sesión para alquilar</Link>
            )}
          </div>
          {sesionIniciada && puedeAgregar && <p className="catalogo__ayuda">Las fechas del alquiler las eliges en el carrito.</p>}
        </div>
      </div>
    </div>
  );
}
