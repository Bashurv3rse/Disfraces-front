import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../../lib/api";
import "./dashboard.css";

const COLORES_DONA = ["#C0392B", "#2F6E62", "#A5301F", "#7A6E5C", "#24544A", "#D9B98A", "#8E5B4A", "#4C7A6E"];

interface Resumen {
  totalAlquileres: number;
  alquileresActivos: number;
  alquileresProximos: number;
  ingresosMes: number;
  devolucionesPendientes: number;
  ultimosAlquileres: { cliente: string; monto: number; estado: string }[];
  ingresosMensuales: { mes: string; ingresos: number }[];
  porCategoria: { categoria: string; valor: number }[];
  alquileresPorDia: { dia: string; cantidad: number }[];
  alertasStock: { nombre: string; detalle: string; unidades: number }[];
}

export default function Dashboard() {
  const [resumen, setResumen] = useState<Resumen | null>(null);

  useEffect(() => {
    api.get("/alquileres/admin/resumen").then(({ data }) => setResumen(data));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Dashboard general</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
        Todos los datos de esta página se calculan en vivo desde tu base de datos.
      </p>

      <div className="dash-metricas">
        <div className="card dash-metrica">
          <span className="dash-metrica__label">Total alquileres</span>
          <strong className="dash-metrica__valor">{resumen?.totalAlquileres ?? "…"}</strong>
        </div>
        <div className="card dash-metrica">
          <span className="dash-metrica__label">Alquileres activos</span>
          <strong className="dash-metrica__valor">{resumen?.alquileresActivos ?? "…"}</strong>
          <span className="dash-metrica__nota">
            en curso ahora{resumen && resumen.alquileresProximos > 0 ? ` · ${resumen.alquileresProximos} próximos` : ""}
          </span>
        </div>
        <div className="card dash-metrica">
          <span className="dash-metrica__label">Ingresos del mes</span>
          <strong className="dash-metrica__valor">S/ {resumen ? resumen.ingresosMes.toFixed(2) : "…"}</strong>
        </div>
        <div className="card dash-metrica">
          <span className="dash-metrica__label">Devoluciones pendientes</span>
          <strong className="dash-metrica__valor">{resumen?.devolucionesPendientes ?? "…"}</strong>
          <span className="dash-metrica__nota">requieren revisión</span>
        </div>
      </div>

      <div className="dash-grid-2">
        <div className="card">
          <h2 className="dash-card__titulo">Ingresos mensuales</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={resumen?.ingresosMensuales ?? []}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
              <Line type="monotone" dataKey="ingresos" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="dash-card__titulo">Por categoría</h2>
          {!resumen || resumen.porCategoria.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>Aún no hay piezas alquiladas para mostrar.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={resumen.porCategoria} dataKey="valor" nameKey="categoria" innerRadius={50} outerRadius={80}>
                    {resumen.porCategoria.map((_, i) => (
                      <Cell key={i} fill={COLORES_DONA[i % COLORES_DONA.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="dash-leyenda">
                {resumen.porCategoria.map((c, i) => (
                  <li key={c.categoria}>
                    <span className="dash-leyenda__punto" style={{ background: COLORES_DONA[i % COLORES_DONA.length] }} />
                    {c.categoria}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="dash-grid-2">
        <div className="card">
          <h2 className="dash-card__titulo">Alquileres por día</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={resumen?.alquileresPorDia ?? []}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="dia" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
              <Bar dataKey="cantidad" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="dash-card__titulo">Últimos alquileres</h2>
          {!resumen || resumen.ultimosAlquileres.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>Aún no hay alquileres registrados.</p>
          ) : (
            <ul className="dash-ultimos">
              {resumen.ultimosAlquileres.map((a, i) => (
                <li key={i}>
                  <span className="dash-ultimos__avatar">{a.cliente.charAt(0)}</span>
                  <span className="dash-ultimos__nombre">{a.cliente}</span>
                  <span className="dash-ultimos__monto">
                    S/ {a.monto.toFixed(2)}
                    <span className={`dash-ultimos__estado dash-ultimos__estado--${a.estado}`}>{a.estado}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="dash-card__titulo">
          <span aria-hidden="true">⚠️</span> Alertas de stock bajo
        </h2>
        {!resumen || resumen.alertasStock.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No hay piezas con stock bajo por ahora.</p>
        ) : (
          <div className="dash-alertas">
            {resumen.alertasStock.map((a) => (
              <div key={a.nombre} className="dash-alerta">
                <strong>{a.nombre}</strong>
                <span className="dash-alerta__detalle">{a.detalle}</span>
                <span className="dash-alerta__unidades">{a.unidades} und.</span>
                <div className="dash-alerta__barra">
                  <div className="dash-alerta__barra-fill" style={{ width: `${Math.min(a.unidades * 10, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}