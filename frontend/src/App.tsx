import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          {/* Demo route - direct editor access without auth */}
          <Route path="/demo" element={<EditorPage />} />
          
          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/editor/:id"
            element={
              <ProtectedRoute>
                <EditorPage />
              </ProtectedRoute>
            }
          />
          
          {/* Redirect root to demo for now (switch to /dashboard when backend is deployed) */}
          <Route path="/" element={<Navigate to="/demo" replace />} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/demo" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
