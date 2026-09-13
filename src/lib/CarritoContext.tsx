import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

export interface ItemCarrito {
  disfrazFisicoId: string;
  nombre: string;
  tipoDisfraz: string;
  precioAlquiler: number;
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
}

const CarritoContext = createContext<CarritoContextValue | null>(null);

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [abierto, setAbierto] = useState(false);

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

  const totalPorDia = items.reduce((s, i) => s + i.precioAlquiler, 0);

  return (
    <CarritoContext.Provider
      value={{ items, agregarItem, quitarItem, vaciarCarrito, totalPorDia, abierto, abrirCarrito, cerrarCarrito }}
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