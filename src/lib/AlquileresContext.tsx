import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { ItemCarrito } from "./CarritoContext";

export interface Alquiler {
  id: string;
  nombreConjunto: string;
  piezas: ItemCarrito["piezas"];
  fechaInicio: string;
  fechaFin: string;
  evento: string;
  estado: "ACTIVO" | "FINALIZADO";
  montoTotal: number;
}

interface AlquileresContextValue {
  alquileres: Alquiler[];
  confirmarAlquiler: (datos: Omit<Alquiler, "id" | "estado">) => void;
}

const AlquileresContext = createContext<AlquileresContextValue | null>(null);

const CLAVE_STORAGE = "disfraces-mock-alquileres";

// Mock persistido en localStorage: no es el back-end real (eso llega en el Sprint 7),
// pero permite que la demo sobreviva a un refresh de página.
export function AlquileresProvider({ children }: { children: ReactNode }) {
  const [alquileres, setAlquileres] = useState<Alquiler[]>(() => {
    const guardado = localStorage.getItem(CLAVE_STORAGE);
    return guardado ? JSON.parse(guardado) : [];
  });

  const confirmarAlquiler = useCallback((datos: Omit<Alquiler, "id" | "estado">) => {
    setAlquileres((prev) => {
      const nuevo: Alquiler = { ...datos, id: crypto.randomUUID(), estado: "ACTIVO" };
      const actualizados = [nuevo, ...prev];
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(actualizados));
      return actualizados;
    });
  }, []);

  return (
    <AlquileresContext.Provider value={{ alquileres, confirmarAlquiler }}>
      {children}
    </AlquileresContext.Provider>
  );
}

export function useAlquileres() {
  const ctx = useContext(AlquileresContext);
  if (!ctx) throw new Error("useAlquileres debe usarse dentro de AlquileresProvider");
  return ctx;
}