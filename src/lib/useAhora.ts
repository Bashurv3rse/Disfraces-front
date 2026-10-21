import { useEffect, useState } from "react";

// Devuelve la hora actual (en ms) y la actualiza cada segundo mientras `activo` sea true.
// Sirve para las cuentas regresivas sin que cada componente maneje su propio temporizador.
export function useAhora(activo: boolean = true): number {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!activo) return;
    setAhora(Date.now());
    const id = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activo]);

  return ahora;
}

// 754000 ms -> "12:34"
export function formatearCuenta(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return `${minutos}:${String(segundos).padStart(2, "0")}`;
}