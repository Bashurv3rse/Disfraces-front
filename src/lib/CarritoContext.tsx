import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export interface PiezaResumen {
  etiqueta: string;
  nombre: string;
  color: string;
  talla: string;
}

export interface ItemCarrito {
  disfrazFisicoId: string;
  nombre: string;
  tipoDisfraz: string;
  precioAlquiler: number;
  // Solo para disfraces a medida: su reserva sin pagar y el instante LOCAL en que vence
  // (se calcula con los segundos restantes que informa el servidor, así no depende del reloj del equipo).
  reservaId?: string;
  venceMs?: number;
  piezas?: PiezaResumen[];
}

interface CarritoContextValue {
  items: ItemCarrito[];
  agregarItem: (item: ItemCarrito) => void;
  quitarItem: (disfrazFisicoId: string) => void;
  vaciarCarrito: () => void;
  totalPorDia: number;
  abierto: boolean;
  abrirCarrito: () => void;
  cerrarCarrito: () => void;
  aviso: string | null;
  descartarAviso: () => void;
}

const CarritoContext = createContext<CarritoContextValue | null>(null);

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [reloj, setReloj] = useState(0);

  const agregarItem = useCallback((item: ItemCarrito) => {
    setItems((prev) => (prev.some((i) => i.disfrazFisicoId === item.disfrazFisicoId) ? prev : [...prev, item]));
    setAbierto(true);
  }, []);

  const quitarItem = useCallback((disfrazFisicoId: string) => {
    setItems((prev) => prev.filter((i) => i.disfrazFisicoId !== disfrazFisicoId));
  }, []);

  const vaciarCarrito = useCallback(() => setItems([]), []);
  const abrirCarrito = useCallback(() => setAbierto(true), []);
  const cerrarCarrito = useCallback(() => setAbierto(false), []);
  const descartarAviso = useCallback(() => setAviso(null), []);

  // Quita del carrito los disfraces a medida cuya reserva ya venció (el servidor ya devolvió
  // sus piezas al almacén). Un solo temporizador apunta al vencimiento más cercano.
  useEffect(() => {
    const vencimientos = items.flatMap((i) => (i.venceMs != null ? [i.venceMs] : []));
    if (vencimientos.length === 0) return;

    const espera = Math.max(0, Math.min(...vencimientos) - Date.now()) + 300;
    const temporizador = window.setTimeout(() => {
      const ahora = Date.now();
      const vencidos = items.filter((i) => i.venceMs != null && i.venceMs <= ahora);

      if (vencidos.length === 0) {
        setReloj((r) => r + 1); // el temporizador saltó un poco antes: se vuelve a programar
        return;
      }

      setItems((prev) => prev.filter((i) => !(i.venceMs != null && i.venceMs <= ahora)));
      const nombres = vencidos.map((v) => `«${v.nombre}»`).join(", ");
      setAviso(
        vencidos.length === 1
          ? `La reserva de ${nombres} venció y se quitó del carrito. Puedes armarlo de nuevo cuando quieras.`
          : `Las reservas de ${nombres} vencieron y se quitaron del carrito. Puedes armarlos de nuevo cuando quieras.`
      );
    }, espera);

    return () => window.clearTimeout(temporizador);
  }, [items, reloj]);

  const totalPorDia = items.reduce((s, i) => s + i.precioAlquiler, 0);

  return (
    <CarritoContext.Provider
      value={{
        items,
        agregarItem,
        quitarItem,
        vaciarCarrito,
        totalPorDia,
        abierto,
        abrirCarrito,
        cerrarCarrito,
        aviso,
        descartarAviso,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de CarritoProvider");
  return ctx;
}