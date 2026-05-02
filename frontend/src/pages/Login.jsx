import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import { loginStart, loginSuccess, loginFailure } from '../redux/authSlice';
import { showNotification } from '../redux/uiSlice';
import Card from '../components/Card';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'sportsman' });
  const { loading } = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(loginStart());
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const res = await api.default.post(endpoint, formData);
      
      if (res.success) {
        if (isRegister) {
          dispatch(showNotification({ type: 'success', message: 'Registration successful! Please login.' }));
          setIsRegister(false);
        } else {
          dispatch(loginSuccess({ token: res.token, user: res.user }));
          dispatch(showNotification({ type: 'success', message: `Welcome back, ${res.user.username}!` }));
          navigate('/dashboard');
        }
      }
    } catch (err) {
      dispatch(loginFailure(err.message));
      dispatch(showNotification({ type: 'error', message: err.message }));
    }
  };

  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #1e293b, #0f172a)', overflow: 'hidden', position: 'relative'
    }}>
      {/* Decorative blobs */}
      <div style={{ position: 'absolute', top: '10%', right: '10%', width: 400, height: 400, background: 'rgba(59,130,246,0.1)', filter: 'blur(80px)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: 300, height: 300, background: 'rgba(139,92,246,0.1)', filter: 'blur(80px)', borderRadius: '50%' }} />

      <Card style={{ 
        width: '100%', maxWidth: 400, padding: 40, background: 'rgba(255, 255, 255, 0.03)', 
        backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ 
            width: 60, height: 60, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
            borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 16px' 
          }}>⚽</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>{isRegister ? 'Create Account' : 'Welcome Back'}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{isRegister ? 'Join the AthleteML community' : 'Sign in to access your dashboard'}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Username</label>
            <input 
              required
              type="text" 
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              style={{ 
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 10, 
                padding: '12px 16px', color: 'white', outline: 'none', transition: 'border-color 0.2s'
              }} 
              placeholder="Enter your username"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Password</label>
            <input 
              required
              type="password" 
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              style={{ 
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 10, 
                padding: '12px 16px', color: 'white', outline: 'none'
              }} 
              placeholder="••••••••"
            />
          </div>

          {isRegister && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Role</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                style={{ 
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 10, 
                  padding: '12px 16px', color: 'white', outline: 'none'
                }}
              >
                <option value="sportsman" style={{ background: '#1e293b' }}>Sportsman</option>
                <option value="manager" style={{ background: '#1e293b' }}>Manager</option>
                <option value="admin" style={{ background: '#1e293b' }}>Admin</option>
              </select>
            </div>
          )}

          <button 
            disabled={loading}
            type="submit"
            style={{ 
              marginTop: 10, padding: '14px', borderRadius: 12, border: 'none', 
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', 
              fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s',
              boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.4)'
            }}
          >
            {loading ? 'Processing...' : (isRegister ? 'Register' : 'Sign In')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button 
            onClick={() => setIsRegister(!isRegister)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>
      </Card>
    </div>
  );
}
