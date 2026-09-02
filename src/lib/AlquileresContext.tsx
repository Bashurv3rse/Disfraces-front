import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { PiezaCarrito } from "./CarritoContext";

export interface Alquiler {
  id: string;
  nombreConjunto: string;
  piezas: PiezaCarrito[];
  fechaInicio: string;
  fechaFin: string;
  evento: string;
  estado: "ACTIVO" | "FINALIZADO";
  montoTotal: number;
  clienteNombre: string;
  clienteEmail: string;
}

interface AlquileresContextValue {
  alquileres: Alquiler[];
  confirmarAlquiler: (datos: Omit<Alquiler, "id" | "estado">) => void;
  devolverAlquiler: (id: string) => void;
}

const AlquileresContext = createContext<AlquileresContextValue | null>(null);

const CLAVE_STORAGE = "disfraces-mock-alquileres";

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

  // Simula la devolución eliminando el registro (mock) — la lógica real de
  // devoluciones con inspección de piezas llega en el Sprint 5/7.
  const devolverAlquiler = useCallback((id: string) => {
    setAlquileres((prev) => {
      const actualizados = prev.filter((a) => a.id !== id);
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(actualizados));
      return actualizados;
    });
  }, []);

  return (
    <AlquileresContext.Provider value={{ alquileres, confirmarAlquiler, devolverAlquiler }}>
      {children}
    </AlquileresContext.Provider>
  );
}

export function useAlquileres() {
  const ctx = useContext(AlquileresContext);
  if (!ctx) throw new Error("useAlquileres debe usarse dentro de AlquileresProvider");
  return ctx;
}