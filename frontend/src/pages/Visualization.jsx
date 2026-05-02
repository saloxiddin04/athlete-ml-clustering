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
  const [activeTab, setActiveTab] = useState('ai');
  const [activeRadar, setActiveRadar] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [comparison, setComparison] = useState(null);

  // Optimizing points to prevent Recharts from freezing the browser when rendering thousands of SVG nodes
  const displayPoints = points?.slice(0, 800) || [];

  useEffect(() => {
    // dispatch(fetchClusters());
    // dispatch(fetchModelMeta());
    loadData();
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
      const res = await api.uploadCSV(formData, (p) => console.log(`Upload: ${p}%`));
      if (res.success) {
        dispatch(showNotification({ type: 'success', title: 'Upload Complete', message: `Processed records successfully.` }));
        dispatch(fetchClusters());
      }
    } catch (err) {
      dispatch(showNotification({ type: 'error', title: 'Upload Failed', message: err.message }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getRadarData = (group) => group ? [
    { subject: 'Endurance', A: group.avg_endurance * 5, fullMark: 100 },
    { subject: 'Sleep', A: group.avg_sleep * 10, fullMark: 100 },
    { subject: 'Stress Inv.', A: (10 - group.avg_stress) * 10, fullMark: 100 },
    { subject: 'Heart', A: (100 - (group.avg_heart_rate - 60)), fullMark: 100 },
    { subject: 'BMI Opt.', A: (40 - Math.abs(group.avg_bmi - 22)) * 2.5, fullMark: 100 },
  ] : [];

  const SidebarButton = ({ label, icon, id }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        width: '100%', padding: '14px 18px', border: 'none', borderRadius: 12, textAlign: 'left',
        background: activeTab === id ? 'var(--accent-blue)' : 'transparent',
        color: activeTab === id ? 'white' : 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600, fontSize: 13
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span> {label}
    </button>
  );

  const { user } = useSelector(s => s.auth);
  const isAdmin = user?.role === 'admin';

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', background: 'var(--bg-main)' }}>
      {/* Sidebar */}
      <div style={{ width: 280, padding: 24, borderRight: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20 }}>View Mode</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SidebarButton id="ai" label="AI Learning Map" icon="🤖" />
          <SidebarButton id="stats" label="Health Indicators" icon="📊" />
          <SidebarButton id="insights" label="Smart Insights" icon="💡" />
          <SidebarButton id="compare" label="Model Comparison" icon="⚖️" />
        </div>

        {isAdmin && (
          <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <div
              onClick={() => !uploading && fileInputRef.current.click()}
              style={{
                padding: 24, border: '2px dashed var(--border)', borderRadius: 16, textAlign: 'center',
                cursor: uploading ? 'not-allowed' : 'pointer', marginBottom: 16, background: uploading ? 'rgba(255,255,255,0.02)' : 'transparent'
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>{uploading ? '⏳' : '📁'}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{uploading ? 'Uploading...' : 'Import Data'}</div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" style={{ display: 'none' }} />
            </div>

            <button
              disabled={training} onClick={handleTrain}
              style={{
                width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white',
                fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              {training ? '🤖 Learning...' : '⚡ Re-Train AI'}
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: 40, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>{activeTab === 'ai' ? 'AI Learning Map' : 'Health Analytics Dashboard'}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {activeTab === 'ai' ? 'Projecting 23 health markers into 2D AI cluster space.' : 'Comparative population analysis across fitness levels.'}
            </p>
          </div>

          <div style={{ 
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', 
            padding: '14px 24px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: training ? '0 0 30px rgba(59,130,246,0.2)' : 'none'
          }}>
            <div style={{ fontSize: 22, animation: training ? 'pulse 1s infinite' : 'none' }}>🛡️</div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: 1 }}>DYNAMIC PRECISION</div>
              <div style={{ fontSize: 22, fontWeight: 950, color: 'white' }}>{modelMeta ? (parseFloat(modelMeta.accuracy) * 100).toFixed(1) : '---'}%</div>
            </div>
          </div>
        </div>

        {activeTab === 'ai' ? (
          <div className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
                <Card style={{ padding: 24, background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.02))', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Data Points Projected</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'white', marginTop: 8 }}>{points?.length || 0}</div>
                </Card>
                <Card style={{ padding: 24, background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))', borderLeft: '4px solid #10b981' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Discovered Clusters</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'white', marginTop: 8 }}>{groups?.length || 0}</div>
                </Card>
                <Card style={{ padding: 24, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.02))', borderLeft: '4px solid #8b5cf6' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Silhouette Score</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'white', marginTop: 8 }}>0.68 <span style={{fontSize: 14, color: '#10b981'}}>Good</span></div>
                </Card>
            </div>
            <Card style={{ padding: 32, marginBottom: 32, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, position: 'relative', zIndex: 2 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800 }}>🔵 PCA Spatial Distribution</h3>
                    <div style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>2D Manifold</div>
                </div>
                <div style={{ height: 550 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis type="number" dataKey="pca_x" hide />
                            <YAxis type="number" dataKey="pca_y" hide />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                                if (!payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                    <div style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', padding: 14, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>ID: {d.participant_id}</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} /> Level: {d.fitness_level}
                                        </div>
                                    </div>
                                );
                            }} />
                            {groups?.map((g, i) => (
                                <Scatter key={g.fitness_level} name={g.fitness_level} data={displayPoints.filter(p => p.fitness_level === g.fitness_level)} fill={COLORS[i % COLORS.length]} />
                            ))}
                            <Legend wrapperStyle={{ paddingTop: 20 }} />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </Card>
          </div>
        ) : activeTab === 'stats' ? (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 32 }}>
                <Card style={{ padding: 32, background: 'linear-gradient(145deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.8) 100%)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
                        <h3 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>🧪 Bio-Radar Profile</h3>
                        <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 12 }}>
                            {groups?.map((g, i) => (
                                <button key={i} onClick={() => setActiveRadar(i)} style={{ 
                                    padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', fontWeight: 600, transition: 'all 0.2s',
                                    background: activeRadar === i ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent', color: activeRadar === i ? 'white' : 'var(--text-secondary)', cursor: 'pointer',
                                    boxShadow: activeRadar === i ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
                                }}>{g.fitness_level}</button>
                            ))}
                        </div>
                    </div>
                    <div style={{ height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={getRadarData(groups?.[activeRadar])}>
                                <defs>
                                    <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                                    </linearGradient>
                                </defs>
                                <PolarGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} />
                                <Radar dataKey="A" stroke="#3b82f6" strokeWidth={3} fill="url(#radarGradient)" fillOpacity={1} />
                                <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card style={{ padding: 32, background: 'linear-gradient(145deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.8) 100%)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                    <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 24 }}>📊 Group Distribution</h3>
                    <div style={{ height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={groups?.map((g, i) => ({ name: g.fitness_level, value: parseInt(g.count), fill: COLORS[i % COLORS.length] })) || []} 
                                    innerRadius={90} outerRadius={130} dataKey="value" label={{ fill: 'white', fontWeight: 600 }} paddingAngle={5}
                                >
                                    {groups?.map((e, i) => <Cell key={i} fill={`url(#pieGradient${i})`} />)}
                                </Pie>
                                <defs>
                                    {COLORS.map((color, i) => (
                                        <linearGradient key={`pieGradient${i}`} id={`pieGradient${i}`} x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0%" stopColor={color} stopOpacity={1}/>
                                            <stop offset="100%" stopColor={color} stopOpacity={0.6}/>
                                        </linearGradient>
                                    ))}
                                </defs>
                                <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                                <Legend wrapperStyle={{ paddingTop: 20 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
             </div>

             <Card style={{ padding: 32, background: 'linear-gradient(145deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.8) 100%)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 24 }}>🧬 Core KPI Comparison</h3>
                <div style={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={groups || []} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="barHeart" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.8}/>
                                </linearGradient>
                                <linearGradient id="barBMI" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#064e3b" stopOpacity={0.8}/>
                                </linearGradient>
                                <linearGradient id="barEndurance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#78350f" stopOpacity={0.8}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="fitness_level" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                            <Legend wrapperStyle={{ paddingTop: 20 }} />
                            <Bar dataKey="avg_heart_rate" name="Avg Heart Rate" fill="url(#barHeart)" radius={[6, 6, 0, 0]} barSize={30} />
                            <Bar dataKey="avg_bmi" name="Avg BMI" fill="url(#barBMI)" radius={[6, 6, 0, 0]} barSize={30} />
                            <Bar dataKey="avg_endurance" name="Endurance Factor" fill="url(#barEndurance)" radius={[6, 6, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
             </Card>
          </div>
        ) : activeTab === 'insights' ? (
           <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
             {insights?.map((ins, i) => (
                <Card key={i} style={{ padding: 24, borderLeft: `4px solid ${ins.color}`, background: 'rgba(255,255,255,0.02)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 24, background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 12 }}>{ins.icon}</div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{ins.title}</h3>
                   </div>
                   <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 16, marginTop: 0 }}>{ins.text}</p>
                   <div style={{ display: 'inline-block', fontSize: 11, padding: '4px 10px', background: `${ins.color}20`, borderRadius: 6, color: ins.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{ins.tag}</div>
                </Card>
             ))}
             {(!insights || insights.length === 0) && (
               <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: 24 }}>No insights generated yet. Ensure you have trained the model.</div>
             )}
           </div>
        ) : (
           <div className="animate-fade-in">
             <Card style={{ padding: 32, background: 'linear-gradient(145deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.8) 100%)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🤖 AI Model Performance Comparison</h3>
                  <div style={{ padding: '6px 14px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 20, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }} /> Full Project Coverage
                  </div>
                </div>
                <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '18px 24px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Algorithm / Model</th>
                        <th style={{ padding: '18px 24px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Task Type</th>
                        <th style={{ padding: '18px 24px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Evaluation Metric</th>
                        <th style={{ padding: '18px 24px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'right' }}>Score / Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison?.algorithmTable?.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '20px 24px', fontWeight: 700, color: '#e2e8f0', fontSize: 15, display: 'flex', alignItems: 'center', gap: 12 }}>
                             <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                                {row.type === 'Clustering' ? '🎯' : row.type === 'Regression' ? '📈' : row.type === 'Anomaly' ? '🔍' : '🗂️'}
                             </div>
                             {row.name}
                          </td>
                          <td style={{ padding: '20px 24px' }}>
                            <span style={{ 
                                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, 
                                background: row.type === 'Regression' ? 'rgba(245,158,11,0.1)' : row.type === 'Classification' ? 'rgba(16,185,129,0.1)' : row.type === 'Anomaly' ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)', 
                                color: row.type === 'Regression' ? '#f59e0b' : row.type === 'Classification' ? '#10b981' : row.type === 'Anomaly' ? '#ef4444' : '#8b5cf6' 
                            }}>{row.type}</span>
                          </td>
                          <td style={{ padding: '20px 24px', color: '#cbd5e1', fontSize: 14, fontWeight: 500 }}>{row.metric}</td>
                          <td style={{ padding: '20px 24px', fontWeight: 800, fontSize: 16, color: 'white', textAlign: 'right' }}>
                             <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
                                {row.value}
                                {parseFloat(row.value) > 0.8 || parseFloat(row.value) > 80 ? (
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</div>
                                ) : parseFloat(row.value) > 0.6 || parseFloat(row.value) > 60 ? (
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>~</div>
                                ) : (
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>!</div>
                                )}
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </Card>
           </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
