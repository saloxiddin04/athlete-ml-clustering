import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearNotification } from '../redux/uiSlice';

export default function Notification() {
  const dispatch = useDispatch();
  const notification = useSelector(s => s.ui.notification);

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => dispatch(clearNotification()), notification.duration || 4000);
    return () => clearTimeout(t);
  }, [notification, dispatch]);

  if (!notification) return null;

  const colors = {
    success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', icon: '✅' },
    error:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  icon: '❌' },
    info:    { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', icon: 'ℹ️' },
    warning: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', icon: '⚠️' },
  };
  const style = colors[notification.type] || colors.info;

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      background: style.bg, border: `1px solid ${style.border}`,
      borderRadius: 10, padding: '12px 18px', maxWidth: 380,
      display: 'flex', alignItems: 'flex-start', gap: 10,
      backdropFilter: 'blur(10px)', animation: 'fadeIn 0.3s ease',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    }}>
      <span style={{ fontSize: 18 }}>{style.icon}</span>
      <div>
        {notification.title && (
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{notification.title}</div>
        )}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{notification.message}</div>
      </div>
      <button onClick={() => dispatch(clearNotification())}
        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  );
}
