import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAthletes, deleteAthleteThunk, resetAthletesThunk } from '../redux/athletesSlice';
import { showNotification } from '../redux/uiSlice';
import Card from '../components/Card';

export default function Athletes() {
  const dispatch = useDispatch();
  const { list, loading, pagination } = useSelector(s => s.athletes);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [showReset, setShowReset] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  useEffect(() => { 
    dispatch(fetchAthletes({ page, limit })); 
  }, [dispatch, page, limit]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete record ${name}?`)) return;
    const result = await dispatch(deleteAthleteThunk(id));
    if (deleteAthleteThunk.fulfilled.match(result)) {
      dispatch(showNotification({ type: 'success', message: `Record deleted.` }));
    }
  };

  const handleReset = async () => {
    const result = await dispatch(resetAthletesThunk());
    if (resetAthletesThunk.fulfilled.match(result)) {
      dispatch(showNotification({ type: 'success', title: 'Reset complete', message: 'All health data cleared.' }));
      setShowReset(false);
    }
  };

  const COLS = [
    { key: 'participant_id', label: 'ID', width: 80 },
    { key: 'age', label: 'Age', width: 60 },
    { key: 'gender', label: 'Gender', width: 90 },
    { key: 'bmi', label: 'BMI', width: 70 },
    { key: 'activity_type', label: 'Activity', width: 110 },
    { key: 'avg_heart_rate', label: 'BPM', width: 70 },
    { key: 'systolic_bp', label: 'BP(S)', width: 70 },
    { key: 'diastolic_bp', label: 'BP(D)', width: 70 },
    { key: 'fitness_level', label: 'Level', width: 100 },
    { key: 'source', label: 'Source', width: 100 },
  ];

  const { user } = useSelector(s => s.auth);
  const isAdmin = user?.role === 'admin';

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Health Records</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            {pagination.total} records found in the consolidated dataset.
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowReset(true)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)',
                background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer',
                fontSize: 13, fontFamily: 'inherit', fontWeight: 600
              }}>
              🗑 Clear Data
            </button>
          </div>
        )}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
            <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', margin: '0 auto 12px' }} />
            Syncing data...
          </div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No health data found</div>
            <div style={{ fontSize: 13 }}>Upload your dataset on the dashboard to begin analysis.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                  {COLS.map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)}
                      style={{
                        padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                        color: sortKey === col.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8,
                        whiteSpace: 'nowrap', minWidth: col.width
                      }}>
                      {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                  <th style={{ padding: '14px 16px' }}></th>
                </tr>
              </thead>
              <tbody>
                {list.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--accent-cyan)' }}>{item.participant_id}</td>
                    <td style={{ padding: '12px 16px' }}>{item.age}</td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{item.gender}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace' }}>{parseFloat(item.bmi).toFixed(1)}</td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{item.activity_type}</td>
                    <td style={{ padding: '12px 16px' }}>{item.avg_heart_rate}</td>
                    <td style={{ padding: '12px 16px' }}>{item.systolic_bp}</td>
                    <td style={{ padding: '12px 16px' }}>{item.diastolic_bp}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', border: '1px solid rgba(16,185,129,0.3)'
                      }}>
                        {item.fitness_level.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                       <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 10,
                        background: item.source === 'from_csv' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
                        color: item.source === 'from_csv' ? 'var(--accent-blue)' : 'var(--accent-purple)',
                        border: `1px solid ${item.source === 'from_csv' ? 'rgba(59,130,246,0.2)' : 'rgba(139,92,246,0.2)'}`
                      }}>
                        {item.source.split('_').join(' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {isAdmin && (
                        <button onClick={() => handleDelete(item.id, item.participant_id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', opacity: 0.6 }}
                        >🗑</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination Footer */}
      {!loading && pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Showing <strong>{list.length}</strong> of <strong>{pagination.total}</strong> records
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-card)', color: page === 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
                cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13
              }}
            >
              Previous
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pagination.pages || Math.abs(p - page) <= 1)
              .map((p, i, arr) => (
                <div key={p} style={{ display: 'flex', gap: 6 }}>
                  {i > 0 && arr[i-1] !== p - 1 && <span style={{ color: 'var(--text-secondary)' }}>...</span>}
                  <button 
                    onClick={() => setPage(p)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                      background: page === p ? 'var(--accent-blue)' : 'var(--bg-card)',
                      color: page === p ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer', fontSize: 13, fontWeight: page === p ? 700 : 400
                    }}
                  >
                    {p}
                  </button>
                </div>
              ))
            }
            <button 
              disabled={page === pagination.pages}
              onClick={() => setPage(p => p + 1)}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-card)', color: page === pagination.pages ? 'var(--text-secondary)' : 'var(--text-primary)',
                cursor: page === pagination.pages ? 'not-allowed' : 'pointer', fontSize: 13
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showReset && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <Card style={{ maxWidth: 400, width: '90%' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>⚠️ Reset All Data?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
              This will permanently delete all participants, uploads, and model results.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowReset(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleReset}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
                Delete Everything
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
