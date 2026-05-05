import { useState, useEffect, useCallback } from 'react';
import {
	BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
	Cell
} from 'recharts';
import * as api from '../services/api';
import Card from '../components/Card';
import { useDispatch } from 'react-redux';
import { showNotification } from '../redux/uiSlice';

const COLORS = {
	healthy: '#10b981',
	moderate: '#f59e0b',
	risk: '#ef4444',
	blue: '#3b82f6',
	purple: '#8b5cf6',
	chart: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'],
	fitness: {
		low: '#ef4444', // Red
		mid: '#f59e0b', // Yellow
		high: '#f97316'  // Orange
	}
};

export default function Dashboard() {
	const dispatch = useDispatch();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [filters, setFilters] = useState({
		gender: '',
		activity_type: '',
		health_condition: '',
		age_min: '',
		age_max: '',
		date_start: '',
		date_end: ''
	});

	const loadAnalytics = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			// Direct API call to high-performance analytics engine
			const res = await api.getAnalytics(filters);
			if (res.success && res.data) {
				setData(res.data);
			} else {
				setError('Data format error');
			}
		} catch (e) {
			setError(e.message);
			console.error('Analytics Error:', e);
		} finally {
			setLoading(false);
		}
	}, [filters]);

	useEffect(() => {
		loadAnalytics();
	}, [loadAnalytics]);

	const kpis = data?.kpis || {};
	const risks = data?.risks || {};

	if (loading && !data) return (
		<div style={{
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			height: '80vh',
			gap: 20
		}}>
			<div className="animate-spin" style={{
				width: 40,
				height: 40,
				border: '3px solid var(--border)',
				borderTopColor: 'var(--accent-blue)',
				borderRadius: '50%'
			}} />
			<div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Aggregating 687,701 health records...</div>
		</div>
	);

	const KPICard = ({ label, value, icon, sub, color }) => (
		<Card style={{
			background: 'rgba(255, 255, 255, 0.03)',
			backdropFilter: 'blur(10px)',
			border: '1px solid rgba(255, 255, 255, 0.1)',
			padding: '24px',
			transition: 'transform 0.2s',
			cursor: 'default'
		}} className="hover-scale">
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
				<div>
					<div style={{
						fontSize: 11,
						color: 'var(--text-secondary)',
						textTransform: 'uppercase',
						letterSpacing: 1,
						marginBottom: 8
					}}>{label}</div>
					<div style={{
						fontSize: 32,
						fontWeight: 800,
						color: color || 'var(--text-primary)',
						fontFamily: 'Space Grotesk'
					}}>{value || '0'}</div>
					<div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>
				</div>
				<span style={{ fontSize: 24, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>{icon}</span>
			</div>
		</Card>
	);

	return (
		<div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">

			{/* HEADER & FILTERS */}
			<div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<div>
					<h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>Health Intelligence Dashboard</h1>
					<p
						style={{ color: 'var(--text-secondary)' }}>Processing {parseInt(kpis.total_participants || 0).toLocaleString()} participants
						from central database.</p>
				</div>
				<div style={{ display: 'flex', gap: 12 }}>
					<button onClick={loadAnalytics} style={{
						padding: '8px 16px',
						background: 'var(--bg-card)',
						border: '1px solid var(--border)',
						color: 'white',
						borderRadius: 8,
						cursor: 'pointer',
						fontSize: 12,
						fontWeight: 600
					}}>🔄 Force Refresh
					</button>
					<div style={{
						padding: '8px 16px',
						background: 'rgba(16, 185, 129, 0.1)',
						color: COLORS.healthy,
						borderRadius: 20,
						fontSize: 12,
						fontWeight: 600
					}}>System Live
					</div>
				</div>
			</div>

			{/* TOP ACTIONS & STATS */}
			<div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, marginBottom: 32 }}>
				
				{/* 1. CSV Upload & Database Sync */}
				<Card style={{ padding: 24, border: '2px dashed var(--border)', background: 'rgba(59, 130, 246, 0.02)' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
						<h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>📥 Ma'lumotlarni yuklash (CSV)</h3>
						<span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 800 }}>PYTHON ENGINE V2.0</span>
					</div>
					<div style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: 32, textAlign: 'center' }}>
						<div style={{ fontSize: 32, marginBottom: 16 }}>📁</div>
						<p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
							Datasetni tanlang va bazani yangilang. Format: .csv (80MB gacha)
						</p>
						<input 
							type="file" 
							id="csv-upload" 
							hidden 
							accept=".csv"
							onChange={async (e) => {
								const file = e.target.files[0];
								if (!file) return;
								const formData = new FormData();
								formData.append('file', file);
								try {
									const res = await api.uploadCSV(formData);
									if (res.success) {
										dispatch(showNotification({ type: 'success', title: 'Tayyor!', message: `${res.count} ta yozuv qo'shildi.` }));
										loadAnalytics();
									}
								} catch (err) {
									dispatch(showNotification({ type: 'error', title: 'Xato', message: err.message }));
								}
							}}
						/>
						<button 
							onClick={() => document.getElementById('csv-upload').click()}
							style={{ 
								padding: '12px 24px', borderRadius: 10, border: 'none', 
								background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', 
								fontWeight: 900, cursor: 'pointer', fontSize: 14 
							}}
						>
							Faylni tanlash
						</button>
					</div>
				</Card>

				{/* 2. AI Insights (Feature Importance) */}
				<Card style={{ padding: 24 }}>
					<h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 800 }}>🧠 AI Faktorlar Ahamiyati</h3>
					<div style={{ height: 250 }}>
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={data?.feature_importance?.slice(0, 8)} layout="vertical">
								<XAxis type="number" hide />
								<YAxis dataKey="name" type="category" width={100} style={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
								<Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#0f172a', border: 'none' }} />
								<Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</Card>
			</div>


			{error ? (
				<Card
					style={{
						padding: 40,
						textAlign: 'center',
						border: `1px solid ${COLORS.risk}`,
						background: 'rgba(239,68,68,0.05)'
					}}
				>
					<div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
					<div style={{ fontWeight: 700, marginBottom: 4 }}>Analytics Sync Error</div>
					<div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{error}</div>
				</Card>
			) : (
				<>
					{/* KPI ROW */}
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 32 }}>
						<KPICard
							label="Total Athletes" value={parseInt(kpis.total_participants || 0).toLocaleString()} icon="👥"
							sub="Verified Records"
						/>
						<KPICard
							label="Avg BMI" value={parseFloat(kpis.avg_bmi || 0).toFixed(1)} icon="⚖️"
							sub="Precision Indicator" color={kpis.avg_bmi > 25 ? COLORS.risk : COLORS.healthy}
						/>
						<KPICard
							label="Daily Steps" value={Math.round(kpis.avg_steps || 0).toLocaleString()} icon="👟"
							sub="Average Activity" color={COLORS.blue}
						/>
						<KPICard
							label="Calories" value={Math.round(kpis.avg_calories || 0).toLocaleString()} icon="🔥"
							sub="Daily Burn" color={COLORS.moderate}
						/>
						<KPICard
							label="Sleep" value={parseFloat(kpis.avg_sleep || 0).toFixed(1)} icon="🛌" sub="Avg Hours"
							color={COLORS.purple}
						/>
						<KPICard
							label="Avg Heart Rate" value={Math.round(kpis.avg_heart_rate || 0)} icon="💓"
							sub="BPM Awareness" color={COLORS.risk}
						/>
					</div>

					{/* NEW: FITNESS LEVEL RANGE */}
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
						<Card style={{ padding: '24px', borderBottom: `4px solid ${COLORS.fitness.low}` }}>
							<div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>MIN FITNESS LEVEL</div>
							<div style={{ fontSize: 48, fontWeight: 900, color: COLORS.fitness.low }}>{parseFloat(kpis.min_fitness || 0).toFixed(1)}</div>
							<div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Critical Performance Threshold</div>
						</Card>
						<Card style={{ padding: '24px', borderBottom: `4px solid ${COLORS.fitness.mid}` }}>
							<div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>AVG FITNESS LEVEL</div>
							<div style={{ fontSize: 48, fontWeight: 900, color: COLORS.fitness.mid }}>{((parseFloat(kpis.min_fitness || 0) + parseFloat(kpis.max_fitness || 0)) / 2).toFixed(1)}</div>
							<div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Community Baseline</div>
						</Card>
						<Card style={{ padding: '24px', borderBottom: `4px solid ${COLORS.fitness.high}` }}>
							<div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>MAX FITNESS LEVEL</div>
							<div style={{ fontSize: 48, fontWeight: 900, color: COLORS.fitness.high }}>{parseFloat(kpis.max_fitness || 0).toFixed(1)}</div>
							<div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Peak Athletic Performance</div>
						</Card>
					</div>

					{/* MAIN CHARTS GRID */}
					<div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, marginBottom: 24 }}>
						<Card style={{ padding: 24 }}>
							<h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>🏃 Caloric Output by Activity Type</h3>
							<div style={{ height: 350 }}>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={data?.activity}>
										<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
										<XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
										<YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
										<Tooltip
											contentStyle={{
												background: 'var(--bg-card)',
												border: '1px solid var(--border)',
												borderRadius: 12
											}}
										/>
										<Bar dataKey="calories" radius={[6, 6, 0, 0]}>
											{data?.activity?.map((entry, index) => <Cell key={index}
												fill={COLORS.chart[index % COLORS.chart.length]} />)}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</Card>
						<Card style={{ borderLeft: `6px solid ${COLORS.risk}`, background: 'rgba(255,255,255,0.01)' }}>
							<h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>🚨 Clinical Risk Assessment</h3>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 10 }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<div>
										<div style={{ fontSize: 13, fontWeight: 700 }}>High BMI Risk {"(>30)"}</div>
										<div style={{
											fontSize: 11,
											color: 'var(--text-secondary)'
										}}>Potential Metabolic Syndrome</div>
									</div>
									<div style={{
										fontSize: 24,
										fontWeight: 800,
										color: COLORS.risk
									}}>{parseInt(risks.high_bmi || 0).toLocaleString()}</div>
								</div>
								<div style={{ height: 1, background: 'var(--border)' }} />
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<div>
										<div style={{ fontSize: 13, fontWeight: 700 }}>Hypertension Alerts</div>
										<div
											style={{ fontSize: 11, color: 'var(--text-secondary)' }}>High Blood Pressure (BP)</div>
									</div>
									<div style={{
										fontSize: 24,
										fontWeight: 800,
										color: COLORS.risk
									}}>{parseInt(risks.high_bp || 0).toLocaleString()}</div>
								</div>
								<div style={{ height: 1, background: 'var(--border)' }} />
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<div>
										<div style={{ fontSize: 13, fontWeight: 700 }}>Sedentary Population</div>
										<div
											style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Under 3,000 steps daily</div>
									</div>
									<div style={{
										fontSize: 24,
										fontWeight: 800,
										color: COLORS.moderate
									}}>{parseInt(risks.low_activity || 0).toLocaleString()}</div>
								</div>
							</div>
						</Card>
					</div>

					{/*/!* NEW: CLUSTERING EDA ANALYSIS *!/*/}
					{/*<div style={{ marginBottom: 24 }}>*/}
					{/*	<Card style={{ padding: 24 }}>*/}
					{/*		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>*/}
					{/*			<h3 style={{ fontSize: 16, fontWeight: 700 }}>🧬 AI-Driven Athlete Clustering (EDA)</h3>*/}
					{/*			<div style={{ display: 'flex', gap: 16 }}>*/}
					{/*				<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>*/}
					{/*					<span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.chart[0] }} /> Cluster 0*/}
					{/*				</div>*/}
					{/*				<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>*/}
					{/*					<span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.chart[1] }} /> Cluster 1*/}
					{/*				</div>*/}
					{/*				<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>*/}
					{/*					<span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.chart[2] }} /> Cluster 2*/}
					{/*				</div>*/}
					{/*			</div>*/}
					{/*		</div>*/}
					{/*		<p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>*/}
					{/*			This visualization uses K-Means to segment athletes into 3 distinct behavioral groups based on their biometric and activity data.*/}
					{/*		</p>*/}
					{/*		<div style={{ height: 400, background: 'rgba(0,0,0,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>*/}
					{/*			/!* Mock Scatter plot for visual representation since Recharts Scatter is more complex to set up quickly *!/*/}
					{/*			<div style={{ width: '100%', height: '100%', padding: 40 }}>*/}
					{/*				<ResponsiveContainer width="100%" height="100%">*/}
					{/*					<BarChart data={data?.activity?.map((a, i) => ({ ...a, cluster: i % 3 }))}>*/}
					{/*						<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />*/}
					{/*						<XAxis dataKey="name" hide />*/}
					{/*						<YAxis hide />*/}
					{/*						<Tooltip />*/}
					{/*						<Bar dataKey="value" radius={[10, 10, 10, 10]}>*/}
					{/*							{data?.activity?.map((entry, index) => (*/}
					{/*								<Cell key={`cell-${index}`} fill={COLORS.chart[index % 3]} />*/}
					{/*							))}*/}
					{/*						</Bar>*/}
					{/*					</BarChart>*/}
					{/*				</ResponsiveContainer>*/}
					{/*			</div>*/}
					{/*			<div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 10, color: 'var(--text-secondary)' }}>*/}
					{/*				*Dimensions projected via PCA*/}
					{/*			</div>*/}
					{/*		</div>*/}
					{/*	</Card>*/}
					{/*</div>*/}
				</>
			)}

			<style>{`
        .glass-select, .glass-input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 14px;
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
          transition: all 0.2s;
        }
        .glass-select:focus, .glass-input:focus {
          border-color: var(--accent-blue);
          background: rgba(255, 255, 255, 0.08);
        }
        .hover-scale:hover {
          transform: scale(1.02);
        }
      `}</style>
		</div>
	);
}
