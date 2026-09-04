import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../../lib/api";
import {
  INGRESOS_MENSUALES,
  POR_CATEGORIA,
  ALQUILERES_POR_DIA,
  ALERTAS_STOCK,
} from "../../lib/mockAdmin";
import "./dashboard.css";

const COLORES_DONA = ["#C0392B", "#2F6E62", "#A5301F", "#7A6E5C", "#24544A", "#D9B98A", "#8E5B4A", "#4C7A6E"];

interface Resumen {
  totalAlquileres: number;
  alquileresActivos: number;
  ingresosMes: number;
  ultimosAlquileres: { cliente: string; monto: number; estado: string }[];
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
        Total, activos, ingresos y últimos alquileres son datos reales de tus clientes. El resto de gráficos
        sigue siendo de ejemplo hasta completar más módulos del back-end.
      </p>

      <div className="dash-metricas">
        <div className="card dash-metrica">
          <span className="dash-metrica__label">Total alquileres</span>
          <strong className="dash-metrica__valor">{resumen?.totalAlquileres ?? "…"}</strong>
        </div>
        <div className="card dash-metrica">
          <span className="dash-metrica__label">Alquileres activos</span>
          <strong className="dash-metrica__valor">{resumen?.alquileresActivos ?? "…"}</strong>
          <span className="dash-metrica__nota">en curso ahora</span>
        </div>
        <div className="card dash-metrica">
          <span className="dash-metrica__label">Ingresos del mes</span>
          <strong className="dash-metrica__valor">S/ {resumen ? resumen.ingresosMes.toFixed(2) : "…"}</strong>
        </div>
        <div className="card dash-metrica">
          <span className="dash-metrica__label">Devoluciones pendientes</span>
          <strong className="dash-metrica__valor">2</strong>
          <span className="dash-metrica__nota">dato de ejemplo</span>
        </div>
      </div>

      <div className="dash-grid-2">
        <div className="card">
          <h2 className="dash-card__titulo">Ingresos mensuales <span className="dash-card__badge">ejemplo</span></h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={INGRESOS_MENSUALES}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
              <Line type="monotone" dataKey="ingresos" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="dash-card__titulo">Por categoría <span className="dash-card__badge">ejemplo</span></h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={POR_CATEGORIA} dataKey="valor" nameKey="categoria" innerRadius={50} outerRadius={80}>
                {POR_CATEGORIA.map((_, i) => (
                  <Cell key={i} fill={COLORES_DONA[i % COLORES_DONA.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dash-grid-2">
        <div className="card">
          <h2 className="dash-card__titulo">Alquileres por día <span className="dash-card__badge">ejemplo</span></h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ALQUILERES_POR_DIA}>
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
          <span aria-hidden="true">⚠️</span> Alertas de stock bajo <span className="dash-card__badge">ejemplo</span>
        </h2>
        <div className="dash-alertas">
          {ALERTAS_STOCK.map((a) => (
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
      </div>
    </div>
  );
}