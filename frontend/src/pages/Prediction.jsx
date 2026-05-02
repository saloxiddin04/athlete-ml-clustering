import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import * as api from '../services/api';
import { showNotification } from '../redux/uiSlice';
import Card from '../components/Card';

/**
 * Prediction sahifasi — faqat Regression + Smart Recommendation
 *
 * Olib tashlangan tablar:
 *   - Classification (Fitness Level)   → predictionController.js tomonidan boshqariladi
 *   - Health Risk & Anomaly            → insightsController.js tomonidan boshqariladi
 *
 * Qolgan funksiyalar:
 *   1. Kaloriya bashoratlash (Min-Max normalizatsiya bilan o'qitilgan RF/Linear/GBM)
 *   2. O'xshash 3 ta sportchini ko'rsatish (activity_type bir xil, KNN masofasi bilan)
 *   3. Smart Recommendation (KNN — eng mos faoliyat tavsiyasi)
 */
export default function Prediction() {
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    participant_id: `PN-${Math.round(Math.random() * 10000)}`,
    age: 25,
    gender: 'Male',
    height_cm: 175,
    weight_kg: 70,
    bmi: 22.8,
    activity_type: 'running',
    duration_minutes: 45,
    intensity: 'medium',
    daily_steps: 8000,
    avg_heart_rate: 135,
    resting_heart_rate: 65,
    systolic_bp: 120,
    diastolic_bp: 80,
    endurance_level: 12,
    sleep_hours: 8,
    stress_level: 3,
    hydration_level: 2.5,
    smoke_status: 'never',
    health_condition: 'healthy'
  });

  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState('');
  const [modelUsed, setModelUsed]   = useState('rf');
  const [trainMetrics, setTrainMetrics] = useState(null);

  // Sahifa ochilganda oldingi metrikalari olish
  useEffect(() => {
    api.getRegressionMetrics()
      .then(res => { if (res.success && res.metrics) setTrainMetrics(res.metrics); })
      .catch(() => {});
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Bashorat qilish
  const handlePredict = async e => {
    e.preventDefault();
    setLoading('predict');
    setResult(null);
    try {
      const res = await api.predictRegression({ ...formData, model: modelUsed });
      if (res.success) {
        setResult(res);
        if (res.metrics) setTrainMetrics(res.metrics);
      } else {
        dispatch(showNotification({ type: 'error', title: 'Xato', message: res.error }));
      }
    } catch (err) {
      dispatch(showNotification({ type: 'error', title: 'Xato', message: err.message }));
    } finally {
      setLoading('');
    }
  };

  // Modelni o'qitish
  const handleTrain = async () => {
    setLoading('train');
    try {
      const res = await api.trainRegression();
      if (res.success) {
        setTrainMetrics(res.metrics);
        dispatch(showNotification({ type: 'success', title: 'O\'qitish tugadi', message: res.message }));
      }
    } catch (err) {
      dispatch(showNotification({ type: 'error', title: 'O\'qitish xatosi', message: err.message }));
    } finally {
      setLoading('');
    }
  };

  // Intensity rangi
  const intensityColor = v => {
    const s = String(v || '').toLowerCase();
    if (s === 'high')   return '#ef4444';
    if (s === 'medium') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div style={{ padding: 32, maxWidth: 1280, margin: '0 auto' }} className="animate-fade-in">

      {/* ── Header ── */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>
            🔥 Kaloriya Bashoratlash & Aqlli Tavsiya
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Min-Max normalizatsiya bilan o'qitilgan Regression modeli · KNN o'xshash sportchilar · Smart Faoliyat Tavsiyasi
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Model tanlash */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>MODEL:</span>
            {['rf', 'gbm', 'linear'].map(m => (
              <button
                key={m}
                onClick={() => setModelUsed(m)}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 12, transition: 'all 0.2s',
                  background: modelUsed === m ? '#3b82f6' : 'rgba(255,255,255,0.06)',
                  color: modelUsed === m ? '#fff' : 'var(--text-secondary)'
                }}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Train tugmasi */}
          <button
            onClick={handleTrain}
            disabled={loading === 'train'}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: loading === 'train' ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 13
            }}
          >
            {loading === 'train' ? '⏳ O\'qitilmoqda...' : '🔄 Modelni O\'qitish'}
          </button>
        </div>
      </div>

      {/* ── Train Metrics Strip ── */}
      {trainMetrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {Object.entries(trainMetrics).map(([name, m]) => (
            <div key={name} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {name === 'rf' ? 'Random Forest' : name === 'gbm' ? 'Gradient Boosting' : 'Linear Regression'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>
                  RMSE: <strong style={{ color: '#f59e0b' }}>{m.rmse}</strong>
                  &nbsp;&nbsp;R²: <strong style={{ color: '#10b981' }}>{m.r2}</strong>
                </div>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: name === 'rf' ? '#3b82f6' : name === 'gbm' ? '#8b5cf6' : '#10b981',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
              }}>
                {name === 'rf' ? '🌲' : name === 'gbm' ? '⚡' : '📐'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Main Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: result ? '1.4fr 1fr' : '1fr', gap: 28, alignItems: 'start' }}>

        {/* ── Form ── */}
        <Card style={{ padding: 28 }}>
          <form onSubmit={handlePredict}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>

              <GroupTitle title="Biologik profil" />
              <Field label="Yosh" name="age" type="number" formData={formData} onChange={handleChange} />
              <Field label="Jins" name="gender" type="select" options={['Male','Female','Other']} formData={formData} onChange={handleChange} />
              <Field label="Sog'lik holati" name="health_condition" type="select"
                options={['healthy','asthma','diabetes','hypertension','heart disease']}
                formData={formData} onChange={handleChange} />
              <Field label="Bo'y (cm)" name="height_cm" type="number" formData={formData} onChange={handleChange} />
              <Field label="Vazn (kg)" name="weight_kg" type="number" formData={formData} onChange={handleChange} />
              <Field label="BMI" name="bmi" type="number" step="0.1" formData={formData} onChange={handleChange} />

              <GroupTitle title="Yurak-qon tomir" />
              <Field label="O'rtacha yurak urishi" name="avg_heart_rate" type="number" formData={formData} onChange={handleChange} />
              <Field label="Tinch yurak urishi" name="resting_heart_rate" type="number" formData={formData} onChange={handleChange} />
              <Field label="Stress darajasi (1-5)" name="stress_level" type="number" formData={formData} onChange={handleChange} />
              <Field label="Sistolik BP" name="systolic_bp" type="number" formData={formData} onChange={handleChange} />
              <Field label="Diastolik BP" name="diastolic_bp" type="number" formData={formData} onChange={handleChange} />
              <Field label="Chidamlilik (1-20)" name="endurance_level" type="number" formData={formData} onChange={handleChange} />

              <GroupTitle title="Faoliyat & Hayot tarzi" />
              <Field label="Faoliyat turi" name="activity_type" type="select"
                options={['running','swimming','cycling','walking','hiit','yoga','basketball','dancing']}
                formData={formData} onChange={handleChange} />
              <Field label="Davomiylik (min)" name="duration_minutes" type="number" formData={formData} onChange={handleChange} />
              <Field label="Kunlik qadamlar" name="daily_steps" type="number" formData={formData} onChange={handleChange} />
              <Field label="Uyqu soatlari" name="sleep_hours" type="number" step="0.5" formData={formData} onChange={handleChange} />
              <Field label="Gidratatsiya (L)" name="hydration_level" type="number" step="0.1" formData={formData} onChange={handleChange} />
              <Field label="Chekish holati" name="smoke_status" type="select"
                options={['never','former','current']}
                formData={formData} onChange={handleChange} />

            </div>

            <button
              type="submit"
              disabled={loading === 'predict'}
              style={{
                width: '100%', marginTop: 24, padding: '16px', borderRadius: 12, border: 'none',
                background: loading === 'predict'
                  ? 'rgba(59,130,246,0.5)'
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff', fontWeight: 900, cursor: 'pointer', fontSize: 16, letterSpacing: 0.5
              }}
            >
              {loading === 'predict' ? '🧠 Hisoblanmoqda...' : `🔥 Kaloriya & Tavsiya Bashorat (${modelUsed.toUpperCase()})`}
            </button>
          </form>
        </Card>

        {/* ── Results Panel ── */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-slide-up">

            {/* Predicted Calories */}
            <Card style={{ padding: 28, borderTop: '4px solid #f59e0b', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
                Bashorat qilingan kaloriya
              </div>
              <div style={{ fontSize: 64, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>
                {result.predicted_calories}
              </div>
              <div style={{ fontSize: 18, color: 'var(--text-secondary)', marginTop: 4 }}>kcal</div>
              <div style={{
                marginTop: 16, padding: '8px 16px', borderRadius: 8, display: 'inline-block',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                fontSize: 12, color: '#f59e0b', fontWeight: 700
              }}>
                {result.model_used?.toUpperCase()} modeli ishlatildi · Min-Max [0,1] normalizatsiya
              </div>
            </Card>

            {/* Smart Recommendation */}
            {result.recommendation && (
              <Card style={{ padding: 24, borderTop: '4px solid #8b5cf6' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
                  💡 Aqlli Faoliyat Tavsiyasi (KNN)
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#8b5cf6', textTransform: 'capitalize', marginBottom: 12 }}>
                  🏅 {result.recommendation.activity_type}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <InfoRow label="Intensivlik" value={result.recommendation.intensity}
                    valueColor={intensityColor(result.recommendation.intensity)} />
                  <InfoRow label="Davomiylik" value={`${result.recommendation.duration_minutes} daqiqa`} valueColor="#fff" />
                  <InfoRow label="Ishonch" value={`${result.recommendation.confidence}%`} valueColor="#10b981" />
                </div>
                {result.recommendation.health_tip && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                    fontSize: 12, color: '#c4b5fd', lineHeight: 1.5
                  }}>
                    💊 {result.recommendation.health_tip}
                  </div>
                )}
              </Card>
            )}

            {/* Similar Athletes */}
            {result.similar_athletes && result.similar_athletes.length > 0 && (
              <Card style={{ padding: 24, borderTop: '4px solid #10b981' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
                  👥 O'xshash 3 Sportchi (KNN · bir xil faoliyat: {formData.activity_type})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.similar_athletes.map((athlete, i) => (
                    <div key={i} style={{
                      padding: '14px 16px', borderRadius: 10,
                      background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                      display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 12, alignItems: 'center'
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: `linear-gradient(135deg, #10b981, #059669)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 14, color: '#fff'
                      }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Faoliyat</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', textTransform: 'capitalize' }}>
                          {athlete.activity_type}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Kaloriya</div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#f59e0b' }}>
                          {athlete.calories_burned} kcal
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Vaqt / Masofa</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                          {athlete.duration_minutes} min
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                          d={athlete.distance}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  * KNN: kiritilgan sportchi bilan <strong style={{ color: '#10b981' }}>{formData.activity_type}</strong> faoliyati orqali eng yaqin (Min-Max masofa) 3 ta shaxs ko'rsatilgan.
                </div>
              </Card>
            )}

            {result.similar_athletes && result.similar_athletes.length === 0 && (
              <Card style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
                <div>Bir xil faoliyat turida o'xshash sportchi topilmadi ({formData.activity_type})</div>
              </Card>
            )}

          </div>
        )}
      </div>

      <style>{`
        .animate-slide-up { animation: slideUp 0.35s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

const labelStyle = {
  display: 'block', fontSize: 11, color: 'var(--text-secondary)',
  marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5
};
const inputStyle = {
  width: '100%', padding: '9px 11px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)',
  color: 'white', outline: 'none', fontSize: 13
};

const GroupTitle = ({ title }) => (
  <div style={{
    gridColumn: 'span 3', borderBottom: '1px solid var(--border)',
    paddingBottom: 6, marginBottom: 4, marginTop: 10,
    fontSize: 10, color: 'var(--text-secondary)', fontWeight: 900,
    textTransform: 'uppercase', letterSpacing: 1.5
  }}>
    {title}
  </div>
);

function Field({ label, name, type = 'text', options, step, formData, onChange }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {type === 'select' ? (
        <select name={name} value={formData[name]} onChange={onChange} style={inputStyle}>
          {options.map(o => (
            <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={formData[name]}
          onChange={onChange}
          step={step}
          style={inputStyle}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value, valueColor }) {
  return (
    <div style={{
      padding: '8px 12px', borderRadius: 8,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)'
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: valueColor || 'var(--text-primary)', textTransform: 'capitalize' }}>
        {value}
      </div>
    </div>
  );
}
