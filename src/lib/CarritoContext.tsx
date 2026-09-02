import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

export interface PiezaCarrito {
  id: string;
  nombre: string;
  tipo: string;
  tallaEEUU: string;
  color: string;
  precioAlquiler: number;
}

export interface ItemCarrito {
  id: string;
  nombreConjunto: string;
  piezas: PiezaCarrito[];
}

interface CarritoContextValue {
  items: ItemCarrito[];
  agregarItem: (item: Omit<ItemCarrito, "id">) => void;
  quitarItem: (id: string) => void;
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

  const agregarItem = useCallback((item: Omit<ItemCarrito, "id">) => {
    setItems((prev) => [...prev, { ...item, id: crypto.randomUUID() }]);
    setAbierto(true);
  }, []);

  const quitarItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const vaciarCarrito = useCallback(() => setItems([]), []);
  const abrirCarrito = useCallback(() => setAbierto(true), []);
  const cerrarCarrito = useCallback(() => setAbierto(false), []);

  const totalPorDia = items.reduce(
    (acc, item) => acc + item.piezas.reduce((s, p) => s + Number(p.precioAlquiler), 0),
    0
  );

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