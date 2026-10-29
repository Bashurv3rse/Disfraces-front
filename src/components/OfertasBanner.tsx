import { useEffect, useState } from "react";
import { api } from "../lib/api";
import "./ofertas-banner.css";

interface Oferta {
  id: string;
  nombre: string;
  descripcion: string;
  porcentaje: number;
}

export function OfertasBanner() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);

  useEffect(() => {
    let activo = true;
    api
      .get<Oferta[]>("/pagos/ofertas")
      .then(({ data }) => {
        if (activo) setOfertas(data);
      })
      .catch(() => {
        // Sin ofertas visibles: el catálogo funciona igual.
      });
    return () => {
      activo = false;
    };
  }, []);

  if (ofertas.length === 0) return null;

  return (
    <section className="ofertas" aria-label="Ofertas vigentes">
      <h2 className="ofertas__titulo">Ofertas vigentes</h2>
      <ul className="ofertas__lista">
        {ofertas.map((o) => (
          <li key={o.id} className="ofertas__item">
            <span className="ofertas__porcentaje">{o.porcentaje}%</span>
            <span>{o.descripcion}</span>
          </li>
        ))}
      </ul>
      <p className="ofertas__nota">
        Se aplican solas en el carrito y no se acumulan: se usa la mejor oferta. ¿Tienes un cupón? Ingrésalo en el carrito.
      </p>
    </section>
  );
}