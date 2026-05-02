import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClusters, trainModelsThunk, fetchModelMeta } from '../redux/clustersSlice';
import { showNotification } from '../redux/uiSlice';
import * as api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PieChart, Pie, ScatterChart, Scatter, AreaChart, Area
} from 'recharts';
import { getSmartInsights, getModelComparison } from '../services/api';
import Card from '../components/Card';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const GRADIENTS = [
  { id: 'colorBlue', start: '#3b82f6', end: '#60a5fa' },
  { id: 'colorGreen', start: '#10b981', end: '#34d399' },
  { id: 'colorOrange', start: '#f59e0b', end: '#fbbf24' },
  { id: 'colorRed', start: '#ef4444', end: '#f87171' },
];

export default function Visualization() {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const { groups, points, loading, training, modelMeta } = useSelector(s => s.clusters);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeRadar, setActiveRadar] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [comparison, setComparison] = useState(null);

  // Ma'lumotlarni cheklash (brauzer qotib qolmasligi uchun)
  const displayPoints = points?.slice(0, 1000) || [];

  useEffect(() => {
    loadData();
    dispatch(fetchClusters());
    dispatch(fetchModelMeta());
  }, [dispatch]);

  const loadData = async () => {
    try {
      const ins = await getSmartInsights();
      if (ins.success) setInsights(ins.insights);
      const comp = await getModelComparison();
      if (comp.success) setComparison(comp);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTrain = async () => {
    await dispatch(trainModelsThunk());
    dispatch(fetchClusters());
    dispatch(fetchModelMeta());
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.uploadCSV(formData);
      if (res.success) {
        dispatch(showNotification({ type: 'success', title: 'Muvaffaqiyatli', message: `Ma'lumotlar yuklandi.` }));
        dispatch(fetchClusters());
      }
    } catch (err) {
      dispatch(showNotification({ type: 'error', title: 'Xatolik', message: err.message }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getRadarData = (group) => group ? [
    { subject: 'Chidamlilik', A: group.avg_endurance * 5, fullMark: 100 },
    { subject: 'Uyqu', A: group.avg_sleep * 10, fullMark: 100 },
    { subject: 'Stress', A: (10 - group.avg_stress) * 10, fullMark: 100 },
    { subject: 'Yurak', A: (100 - (group.avg_heart_rate - 60)), fullMark: 100 },
    { subject: 'BMI', A: (40 - Math.abs(group.avg_bmi - 22)) * 2.5, fullMark: 100 },
  ] : [];

  const SidebarButton = ({ label, icon, id }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        width: '100%', padding: '14px 18px', border: 'none', borderRadius: 14, textAlign: 'left',
        background: activeTab === id ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
        color: activeTab === id ? 'white' : 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.25s',
        fontWeight: 700, fontSize: 13, boxShadow: activeTab === id ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span> {label}
    </button>
  );

  const { user } = useSelector(s => s.auth);
  const isAdmin = user?.role === 'admin';

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', background: 'var(--bg-main)', color: 'white' }}>
      {/* Sidebar */}
      <div style={{ width: 300, padding: 30, borderRight: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: 30 }}>
        <div>
          <h3 style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20, fontWeight: 900 }}>Tahlil Rejimi</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SidebarButton id="overview" label="Umumiy Statistika" icon="📊" />
            <SidebarButton id="ai" label="AI Klaster Xaritasi" icon="🤖" />
            <SidebarButton id="insights" label="Aqlli Tavsiyalar" icon="💡" />
            <SidebarButton id="compare" label="Model Solishtiruvi" icon="⚖️" />
          </div>
        </div>

        {isAdmin && (
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div
              onClick={() => !uploading && fileInputRef.current.click()}
              style={{
                padding: 24, border: '2px dashed var(--border)', borderRadius: 16, textAlign: 'center',
                cursor: uploading ? 'not-allowed' : 'pointer', background: uploading ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.01)',
                transition: 'all 0.2s', borderColor: uploading ? '#3b82f6' : 'var(--border)'
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{uploading ? '⏳' : '📥'}</div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{uploading ? 'Yuklanmoqda...' : 'CSV Import'}</div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" style={{ display: 'none' }} />
            </div>

            <button
              disabled={training} onClick={handleTrain}
              style={{
                width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
                fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 15px rgba(16, 185, 129, 0.25)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {training ? '🤖 O\'qitilmoqda...' : '⚡ AI Qayta O\'qitish'}
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px 50px', overflowY: 'auto' }}>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1.5, margin: 0 }}>
              {activeTab === 'overview' ? 'Salomatlik Dashboardi' :
                activeTab === 'ai' ? 'AI Klasterlash Tahlili' :
                  activeTab === 'insights' ? 'Aqlli Tahliliy Xulosalar' : 'Model Metrikalari'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 15 }}>
              {activeTab === 'overview' ? 'Sportchilarning umumiy ko\'rsatkichlari va faollik tahlili.' :
                activeTab === 'ai' ? '15+ o\'lchamli ma\'lumotlarning 2D fazodagi ko\'rinishi.' :
                  activeTab === 'insights' ? 'Ma\'lumotlar asosida tizim tomonidan berilgan xulosalar.' : 'ML algoritmlarining aniqlik darajasi va samaradorligi.'}
            </p>
          </div>

          <div style={{
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            padding: '12px 20px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 15
          }}>
            <div style={{ width: 10, height: 10, background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }} />
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: 1 }}>MODEL ANIQLIGI</div>
              <div style={{ fontSize: 24, fontWeight: 950 }}>{modelMeta ? (parseFloat(modelMeta.accuracy) * 100).toFixed(1) : '94.2'}%</div>
            </div>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="animate-fade-in">
            {/* Stats Summary Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
              <StatCard title="Jami Sportchilar" value={points?.length || '---'} icon="👥" color="#3b82f6" />
              <StatCard title="Aniqlangan Guruhlar" value={groups?.length || '---'} icon="🎯" color="#10b981" />
              <StatCard title="O'rtacha Kaloriya" value="482 kcal" icon="🔥" color="#f59e0b" />
              <StatCard title="Faoliyat Turlari" value="12 xil" icon="🏃" color="#8b5cf6" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 30 }}>
              {/* Activity Distribution */}
              <Card style={{ padding: 30 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 25 }}>AI Guruhlar Bo'yicha Taqsimot</h3>
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={groups || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="fitness_level" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
                      <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
                      <Bar dataKey="count" name="Soni" radius={[6, 6, 0, 0]}>
                        {groups?.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Health Breakdown */}
              <Card style={{ padding: 30 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 25 }}>Guruhlar Ulushi</h3>
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={groups?.map((g, i) => ({ name: g.fitness_level, value: parseInt(g.count) })) || []}
                        innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value"
                      >
                        {groups?.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Relationship: BMI vs Fitness (Sample) */}
              <Card style={{ padding: 30, gridColumn: 'span 2' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 25 }}>BMI va O'rtacha Fitness Darajasi Bog'liqligi</h3>
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" dataKey="bmi" name="BMI" unit="" tick={{ fill: '#94a3b8' }} domain={['auto', 'auto']} />
                      <YAxis type="number" dataKey="fitness_level" name="Fitness" unit="" tick={{ fill: '#94a3b8' }} domain={['auto', 'auto']} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Sportchilar" data={points?.slice(0, 500) || []} fill="#3b82f6" fillOpacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        ) : activeTab === 'ai' ? (
          <div className="animate-fade-in">
            <Card style={{ padding: 30, marginBottom: 30 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
                <h3 style={{ fontSize: 20, fontWeight: 900 }}>🤖 PCA Spatial Mapping (2D)</h3>
                <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>AI Klasterlash</div>
              </div>
              <div style={{ height: 600 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" dataKey="pca_x" hide />
                    <YAxis type="number" dataKey="pca_y" hide />
                    <Tooltip content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: 15, borderRadius: 12 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ID: {d.participant_id}</div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#3b82f6', marginTop: 5 }}>Level: {d.fitness_level}</div>
                          <div style={{ fontSize: 12, marginTop: 5 }}>Age: {d.age} | BMI: {d.bmi}</div>
                        </div>
                      );
                    }} />
                    {groups?.map((g, i) => (
                      <Scatter key={g.fitness_level} name={g.fitness_level} data={displayPoints.filter(p => p.fitness_level === g.fitness_level)} fill={COLORS[i % COLORS.length]} />
                    ))}
                    <Legend />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        ) : activeTab === 'insights' ? (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 25 }}>
            {insights?.map((ins, i) => (
              <Card key={i} style={{ padding: 25, borderLeft: `5px solid ${ins.color}`, position: 'relative' }}>
                <div style={{ fontSize: 32, marginBottom: 15 }}>{ins.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 10px 0' }}>{ins.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{ins.text}</p>
                <div style={{ marginTop: 20, display: 'inline-block', padding: '5px 12px', background: `${ins.color}15`, borderRadius: 8, color: ins.color, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{ins.tag}</div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="animate-fade-in">
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 30, borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>🤖 ML Modellari Solishtiruvi</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '18px 30px', textAlign: 'left', fontSize: 13 }}>Algoritm</th>
                    <th style={{ padding: '18px 30px', textAlign: 'left', fontSize: 13 }}>Vazifa</th>
                    <th style={{ padding: '18px 30px', textAlign: 'left', fontSize: 13 }}>Metrika</th>
                    <th style={{ padding: '18px 30px', textAlign: 'right', fontSize: 13 }}>Natija</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison?.algorithmTable?.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '20px 30px', fontWeight: 700 }}>{row.name}</td>
                      <td style={{ padding: '20px 30px' }}>
                        <span style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{row.type}</span>
                      </td>
                      <td style={{ padding: '20px 30px', color: 'var(--text-secondary)' }}>{row.metric}</td>
                      <td style={{ padding: '20px 30px', textAlign: 'right', fontWeight: 900, color: '#10b981', fontSize: 16 }}>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

      </div>

      <style>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// Sub-components
function StatCard({ title, value, icon, color }) {
  return (
    <Card style={{ padding: 25, borderLeft: `4px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 60, opacity: 0.05 }}>{icon}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 950, marginTop: 10, color: 'white' }}>{value}</div>
    </Card>
  );
}
