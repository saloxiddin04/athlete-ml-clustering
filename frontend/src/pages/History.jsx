import { useState, useEffect } from 'react';
import * as api from '../services/api';
import Card from '../components/Card';

export default function TrainingHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await api.getTrainingHistory();
      if (res.success) setHistory(res.history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>🤖 AI O'qitish Tarixi</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Modellarning vaqt bo'yicha o'sishi va aniqlik darajasi.</p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {history.map((item, idx) => (
            <Card key={idx} style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.1)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 
                }}>
                  📈
                </div>
                <div>
                   <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Trained At</div>
                   <div style={{ fontSize: 16, fontWeight: 800 }}>{new Date(item.trained_at).toLocaleString()}</div>
                </div>
                <div>
                   <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Total Records</div>
                   <div style={{ fontSize: 16, fontWeight: 800 }}>{item.total_records.toLocaleString()}</div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Accuracy Score</div>
                <div style={{ fontSize: 24, fontWeight: 950, color: '#10b981' }}>{(item.accuracy * 100).toFixed(1)}%</div>
              </div>
            </Card>
          ))}
          
          {history.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, background: 'rgba(255,255,255,0.02)', borderRadius: 20, color: 'var(--text-secondary)' }}>
              Hozircha o'qitish tarixi mavjud emas.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
