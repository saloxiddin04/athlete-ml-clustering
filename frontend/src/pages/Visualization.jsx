import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Legend, 
  ResponsiveContainer, Cell, BarChart, Bar, CartesianGrid
} from 'recharts';
import * as api from '../services/api';
import Card from '../components/Card';
import { showNotification } from '../redux/uiSlice';

/**
 * Visualization Page — Advanced AI Dashboard
 * Includes: 
 * 1. 2D Scatter Plot (PCA based)
 * 2. Feature Importance (Random Forest based)
 * 3. Cluster Summary Statistics
 */
export default function Visualization() {
  const [data, setData] = useState({ points: [], groups: [] });
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const clusterColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vizRes, metricRes] = await Promise.all([
        api.getClusters(),
        api.getRegressionMetrics()
      ]);
      
      if (vizRes.success) setData(vizRes);
      if (metricRes.success) setMetrics(metricRes.metrics);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Feature Importance Data for Chart
  const importanceData = useMemo(() => {
    if (!metrics || !metrics.feature_importance) return [];
    return metrics.feature_importance.slice(0, 10);
  }, [metrics]);

  return (
    <div style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
      
      {/* --- Header --- */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>📊 AI & Ma'lumotlar Vizualizatsiyasi</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          PCA (Asosiy Komponentlar Tahlili) orqali 2D proyeksiyalash va Random Forest ahamiyatlilik darajalari.
        </p>
      </div>

      {/* --- Main Dashboard Grid --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        
        {/* 1. PCA Scatter Plot */}
        <Card style={{ padding: 24, height: 600 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>🧬 Sportchilar Klasterizatsiyasi (PCA)</h3>
            <button onClick={fetchData} style={{ 
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', 
              color: 'white', padding: '6px 12px', borderRadius: 8, cursor: 'pointer' 
            }}>Yangilash</button>
          </div>
          
          <ResponsiveContainer width="100%" height="90%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis type="number" dataKey="pca_x" name="X" hide />
              <YAxis type="number" dataKey="pca_y" name="Y" hide />
              <ZAxis type="number" range={[60, 400]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                itemStyle={{ color: '#fff' }}
              />
              <Scatter name="Athletes" data={data.points}>
                {data.points.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={clusterColors[entry.cluster_id % 5]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        {/* 2. Feature Importance & AI Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Feature Importance Chart */}
          <Card style={{ padding: 24, height: 350 }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 800 }}>🔍 Faktorlar Ahamiyati (%)</h3>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={importanceData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} style={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#0f172a', border: 'none' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Model Accuracy Summary */}
          <Card style={{ padding: 24, background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.05))' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 800 }}>⚡ Model Aniqligi (R²)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ padding: 16, borderRadius: 12, background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Random Forest</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#3b82f6' }}>{metrics?.rf?.r2?.toFixed(2) || '0.00'}</div>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Grad. Boosting</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#8b5cf6' }}>{metrics?.gbm?.r2?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 12, fontStyle: 'italic' }}>
              * 1.00 - ideal natija. 0.85+ - yuqori ishonchlilik.
            </p>
          </Card>

        </div>
      </div>

      {/* --- Cluster Summary Stats --- */}
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {data.groups.map((g, i) => (
          <Card key={i} style={{ padding: 16, borderLeft: `4px solid ${clusterColors[g.cluster_id % 5]}` }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Klaster {g.cluster_id}</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{g.count} <span style={{ fontSize: 12, fontWeight: 400 }}>ta sportchi</span></div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>O'rtacha BMI: <strong>{g.avg_bmi?.toFixed(1)}</strong></div>
          </Card>
        ))}
      </div>

    </div>
  );
}
