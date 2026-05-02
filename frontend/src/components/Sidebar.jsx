import { useSelector, useDispatch } from 'react-redux';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../redux/authSlice';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⚡', path: '/dashboard' },
  { id: 'athletes', label: 'Athletes', icon: '🏃', path: '/athletes' },
  { id: 'visualization', label: 'Visualizations', icon: '📊', path: '/visualization' },
  { id: 'prediction', label: 'Predict', icon: '🎯', path: '/prediction' },
  { id: 'history', label: 'History', icon: '📜', path: '/history' },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list } = useSelector(s => s.athletes);
  const { user } = useSelector(s => s.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      padding: '24px 0', flexShrink: 0
    }}>
      {/* Logo */}
      <div style={{ padding: '0 20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
          }}>⚽</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.3px' }}>AthleteML</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Clustering Engine</div>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div style={{ padding: '0 16px 24px', marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <div style={{ 
          background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, 
          display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border)' 
        }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-blue)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 
          }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.username}</div>
            <div style={{ fontSize: 10, color: 'var(--accent-blue)', textTransform: 'uppercase', fontWeight: 700 }}>{user?.role}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 12px' }}>
        {NAV_ITEMS.map(item => (
          <NavLink 
            key={item.id} 
            to={item.path}
            style={({ isActive }) => ({
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              marginBottom: 4, fontSize: 14, fontFamily: 'inherit', textDecoration: 'none',
              background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.15s',
              borderLeft: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
            })}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        
        {isAdmin && (
          <NavLink 
            to="/users"
            style={({ isActive }) => ({
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              marginTop: 12, fontSize: 14, fontFamily: 'inherit', textDecoration: 'none',
              background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 400,
              borderTop: '1px solid var(--border)',
              paddingTop: 16
            })}
          >
            <span style={{ fontSize: 16 }}>👥</span>
            Users Management
          </NavLink>
        )}
      </nav>

      {/* Logout */}
      <div style={{ padding: '0 12px', marginTop: 'auto' }}>
        <button 
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 14, background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontWeight: 600
          }}
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</span>
    </div>
  );
}
