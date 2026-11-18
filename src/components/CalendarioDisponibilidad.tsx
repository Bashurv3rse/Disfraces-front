import { useMemo, useState } from "react";
import "./calendario.css";

interface Props {
  // Días en los que no se puede empezar un alquiler (incluye lavado), ambos extremos incluidos.
  ocupaciones: { desde: string; hasta: string }[];
  // Si el disfraz está fuera de circulación (reparación, incompleto, reservado) todo el calendario va en rojo.
  bloqueo?: string | null;
  // Rango elegido en el carrito (opcional): se resalta con un borde.
  inicio?: string;
  fin?: string;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

const aIso = (a: number, m: number, d: number) => `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function hoyLocal(): string {
  const d = new Date();
  return aIso(d.getFullYear(), d.getMonth(), d.getDate());
}

const MOTIVO_BLOQUEO: Record<string, string> = {
  EN_REPARACION: "Este disfraz está en reparación: no se puede alquilar por ahora.",
  INCOMPLETO: "A este disfraz le faltan piezas: no se puede alquilar por ahora.",
  RESERVADO: "Este disfraz está reservado por otra persona.",
};

// Calendario de un mes: verde = libre para empezar el alquiler, rojo = ocupado, gris = ya pasó.
export function CalendarioDisponibilidad({ ocupaciones, bloqueo, inicio, fin }: Props) {
  const hoy = hoyLocal();
  const [anio0, mes0] = hoy.split("-").map(Number);
  const [mes, setMes] = useState({ a: anio0, m: mes0 - 1 });

  const celdas = useMemo(() => {
    const primerDia = new Date(mes.a, mes.m, 1);
    const desfase = (primerDia.getDay() + 6) % 7; // semana desde lunes
    const diasMes = new Date(mes.a, mes.m + 1, 0).getDate();
    return [...Array(desfase).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)] as (number | null)[];
  }, [mes]);

  const ocupado = (iso: string) => !!bloqueo || ocupaciones.some((o) => iso >= o.desde && iso <= o.hasta);
  const esPrimerMes = mes.a === anio0 && mes.m === mes0 - 1;

  function mover(delta: number) {
    setMes((p) => {
      const f = new Date(p.a, p.m + delta, 1);
      return { a: f.getFullYear(), m: f.getMonth() };
    });
  }

  return (
    <div className="calendario" role="group" aria-label="Calendario de disponibilidad">
      {bloqueo && <p className="calendario__aviso">{MOTIVO_BLOQUEO[bloqueo] ?? "No disponible por ahora."}</p>}

      <div className="calendario__cabecera">
        <button type="button" className="calendario__nav" aria-label="Mes anterior" disabled={esPrimerMes} onClick={() => mover(-1)}>
          ‹
        </button>
        <strong>
          {MESES[mes.m]} {mes.a}
        </strong>
        <button type="button" className="calendario__nav" aria-label="Mes siguiente" onClick={() => mover(1)}>
          ›
        </button>
      </div>

      <div className="calendario__grilla">
        {SEMANA.map((d) => (
          <span key={d} className="calendario__semana">
            {d}
          </span>
        ))}
        {celdas.map((d, i) => {
          if (d === null) return <span key={`v${i}`} />;
          const iso = aIso(mes.a, mes.m, d);
          const pasado = iso < hoy;
          const rojo = !pasado && ocupado(iso);
          const enRango = !!inicio && !!fin && iso >= inicio && iso <= fin;
          const clase = pasado ? "pasado" : rojo ? "ocupado" : "libre";
          const texto = pasado ? "ya pasó" : rojo ? "ocupado" : "libre";
          return (
            <span
              key={iso}
              className={`calendario__dia calendario__dia--${clase}${enRango ? " calendario__dia--rango" : ""}`}
              aria-label={`${d} de ${MESES[mes.m]}: ${texto}`}
            >
              {d}
            </span>
          );
        })}
      </div>

      <ul className="calendario__leyenda">
        <li><i className="calendario__muestra calendario__muestra--libre" /> Libre</li>
        <li><i className="calendario__muestra calendario__muestra--ocupado" /> Ocupado (incluye el lavado de 3 días hábiles)</li>
      </ul>
    </div>
  );
}
