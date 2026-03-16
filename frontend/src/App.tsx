import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import BillingPage from './pages/BillingPage';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import FrameDesignerPage from './pages/FrameDesignerPage';
import './index.css';

const THEME_STORAGE_KEY = 'metamech-theme';
const LEGACY_THEME_STORAGE_KEY = 'metamech_theme';

// Apply saved theme on load (default to light when no preference exists).
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as 'dark' | 'light' | null;
const legacyTheme = localStorage.getItem(LEGACY_THEME_STORAGE_KEY) as 'dark' | 'light' | null;
const resolvedTheme: 'dark' | 'light' = savedTheme || legacyTheme || 'light';
document.documentElement.setAttribute('data-theme', resolvedTheme);
localStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);
if (legacyTheme && !savedTheme) {
  localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          
          {/* Protected routes */}
          <Route
            path="/billing"
            element={
              <ProtectedRoute requireSubscription={false}>
                <BillingPage />
              </ProtectedRoute>
            }
          />

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

          <Route
            path="/frame-designer"
            element={
              <ProtectedRoute>
                <FrameDesignerPage />
              </ProtectedRoute>
            }
          />

          {/* Locked demo routes (auth + subscription required) */}
          <Route
            path="/demo"
            element={
              <ProtectedRoute>
                <EditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/frame-designer-demo"
            element={
              <ProtectedRoute>
                <FrameDesignerPage />
              </ProtectedRoute>
            }
          />
          
          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
