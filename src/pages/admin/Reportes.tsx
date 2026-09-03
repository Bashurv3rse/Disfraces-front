import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  COMBINACIONES_TOP,
  PRENDAS_MAS_SOLICITADAS,
  POR_TEMPORADA_REPORTE,
  RENDIMIENTO_PROVEEDOR,
} from "../../lib/mockAdmin";
import "./reportes.css";

export default function Reportes() {
  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Reportes & análisis</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
        Combinaciones más usadas, prendas top y rendimiento por proveedor — datos de ejemplo.
      </p>

      <h2 className="reportes__seccion">Combinaciones más alquiladas</h2>
      <div className="reportes__combos">
        {COMBINACIONES_TOP.map((c, i) => (
          <div key={c.nombre} className="card reportes__combo">
            <span className="reportes__combo-num">#{i + 1}</span>
            <div className="reportes__combo-info">
              <strong>{c.nombre}</strong>
              <span className="reportes__combo-meta">{c.veces}× alquilada · S/ {c.ingresos} ingresos</span>
            </div>
            <span className="reportes__combo-veces">{c.veces} veces</span>
          </div>
        ))}
      </div>

      <h2 className="reportes__seccion">Prendas más solicitadas</h2>
      <div className="card" style={{ marginBottom: "var(--space-5)" }}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={PRENDAS_MAS_SOLICITADAS} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
            <YAxis type="category" dataKey="nombre" stroke="var(--text-muted)" fontSize={12} width={130} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
            <Bar dataKey="veces" fill="var(--accent)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="dash-grid-2">
        <div className="card">
          <h2 className="reportes__seccion" style={{ marginTop: 0 }}>Por temporada</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={POR_TEMPORADA_REPORTE}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="temporada" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
              <Bar dataKey="cantidad" fill="var(--accent-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="reportes__seccion" style={{ marginTop: 0 }}>Rendimiento por proveedor</h2>
          <table className="reportes__tabla">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Prendas</th>
                <th>País</th>
              </tr>
            </thead>
            <tbody>
              {RENDIMIENTO_PROVEEDOR.map((p) => (
                <tr key={p.nombre}>
                  <td>{p.nombre}</td>
                  <td>{p.modelos}</td>
                  <td>{p.pais}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}