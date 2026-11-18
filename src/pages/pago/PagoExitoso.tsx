import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useCarrito } from "../../lib/CarritoContext";
import { api } from "../../lib/api";
import "./pago-exitoso.css";

type Estado = "confirmando" | "exito" | "error";

export default function PagoExitoso() {
  const [searchParams] = useSearchParams();
  const [estado, setEstado] = useState<Estado>("confirmando");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const { vaciarCarrito } = useCarrito();
  const [descargando, setDescargando] = useState(false);
  const [errorBoleta, setErrorBoleta] = useState<string | null>(null);
  const sessionId = searchParams.get("session_id");

  // La boleta la genera Stripe: se pide el enlace y se abre en otra pestaña.
  async function descargarBoleta() {
    setDescargando(true);
    setErrorBoleta(null);
    try {
      const { data } = await api.get<{ url: string }>("/pagos/boleta", { params: { sessionId } });
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      setErrorBoleta(err.response?.data?.mensaje || "No se pudo obtener la boleta. Inténtalo de nuevo.");
    } finally {
      setDescargando(false);
    }
  }

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setEstado("error");
      setMensaje("No se encontró la referencia del pago.");
      return;
    }

    api
      .post("/pagos/confirmar", { sessionId })
      .then(() => {
        vaciarCarrito();
        setEstado("exito");
      })
      .catch((err) => {
        setEstado("error");
        setMensaje(err.response?.data?.mensaje || "No se pudo confirmar el pago.");
      });
  }, [searchParams, vaciarCarrito]);

  return (
    <div className="card pago-exitoso">
      {estado === "confirmando" && (
        <>
          <h1>Confirmando tu pago…</h1>
          <p role="status">Estamos verificando el pago con la pasarela, un momento.</p>
        </>
      )}

      {estado === "exito" && (
        <>
          <h1>¡Pago confirmado! 🎉</h1>
          <p>Tu alquiler ya quedó registrado. Puedes ver los detalles en Mis alquileres.</p>
          <div className="pago-exitoso__acciones">
            <Link to="/mis-alquileres" className="btn btn--primary">Ver mis alquileres</Link>
            <button type="button" className="btn btn--ghost" disabled={descargando} onClick={descargarBoleta}>
              {descargando ? "Preparando boleta…" : "Descargar boleta"}
            </button>
          </div>
          {errorBoleta && <div className="alert alert--danger" role="alert">{errorBoleta}</div>}
        </>
      )}

      {estado === "error" && (
        <>
          <h1>No pudimos confirmar el pago</h1>
          <div className="alert alert--danger" role="alert">{mensaje}</div>
          <Link to="/catalogo" className="btn btn--ghost">Volver al catálogo</Link>
        </>
      )}
    </div>
  );
}
