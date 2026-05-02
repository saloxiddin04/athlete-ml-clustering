import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import * as api from '../services/api';
import { showNotification } from '../redux/uiSlice';
import Card from '../components/Card';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector(s => s.auth);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.default.get('/users');
      if (res.success) {
        setUsers(res.users);
      }
    } catch (err) {
      dispatch(showNotification({ type: 'error', message: err.message }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await api.default.put(`/users/${userId}/role`, { role: newRole });
      if (res.success) {
        dispatch(showNotification({ type: 'success', message: 'User role updated' }));
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch (err) {
      dispatch(showNotification({ type: 'error', message: err.message }));
    }
  };

  const handleDelete = async (userId, username) => {
    if (userId === currentUser.id) {
      return dispatch(showNotification({ type: 'error', message: "You can't delete yourself" }));
    }
    if (!confirm(`Delete user ${username}?`)) return;

    try {
      const res = await api.default.delete(`/users/${userId}`);
      if (res.success) {
        dispatch(showNotification({ type: 'success', message: 'User deleted' }));
        setUsers(users.filter(u => u.id !== userId));
      }
    } catch (err) {
      dispatch(showNotification({ type: 'error', message: err.message }));
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>User Management</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage platform access and user roles.</p>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', margin: '0 auto 12px' }} />
            Loading users...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Username</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Joined</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                        👤
                      </div>
                      {u.username} {u.id === currentUser.id && <span style={{ fontSize: 10, background: 'var(--accent-blue)', padding: '2px 6px', borderRadius: 4 }}>YOU</span>}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <select 
                      value={u.role} 
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={u.id === currentUser.id}
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 6, 
                        padding: '4px 8px', color: 'white', outline: 'none', fontSize: 13
                      }}
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="sportsman">Sportsman</option>
                    </select>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: 12 }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleDelete(u.id, u.username)}
                      disabled={u.id === currentUser.id}
                      style={{ 
                        background: 'none', border: 'none', cursor: u.id === currentUser.id ? 'not-allowed' : 'pointer', 
                        color: '#ef4444', opacity: u.id === currentUser.id ? 0.3 : 0.7 
                      }}
                    >
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
