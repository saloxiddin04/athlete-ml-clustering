import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { fetchAthletes, fetchStats } from './redux/athletesSlice';
import { fetchClusters } from './redux/clustersSlice';
import Sidebar from './components/Sidebar';
import Notification from './components/Notification';
import Dashboard from './pages/Dashboard';
import Athletes from './pages/Athletes';
import Visualization from './pages/Visualization';
import Prediction from './pages/Prediction';
import Login from './pages/Login';
import Users from './pages/Users';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector(s => s.auth);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default function App() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector(s => s.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchAthletes());
      dispatch(fetchClusters());
      dispatch(fetchStats());
    }
  }, [dispatch, isAuthenticated]);

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        {isAuthenticated && <Sidebar />}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} />
            
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/athletes" element={<ProtectedRoute><Athletes /></ProtectedRoute>} />
            <Route path="/visualization" element={<ProtectedRoute><Visualization /></ProtectedRoute>} />
            <Route path="/prediction" element={<ProtectedRoute><Prediction /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
        <Notification />
      </div>
    </BrowserRouter>
  );
}
