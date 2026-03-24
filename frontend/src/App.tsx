import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HomePage from './pages/HomePage';
import SimulationProductPage from './pages/SimulationProductPage';
import SimulationPricingPage from './pages/SimulationPricingPage';
import SimulationAccessPage from './pages/SimulationAccessPage';
import LegacyAccessRedirectPage from './pages/LegacyAccessRedirectPage';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import FrameDesignerPage from './pages/FrameDesignerPage';
import AdminAssetLibraryPage from './pages/AdminAssetLibraryPage';
import AdminAssetEditorPage from './pages/AdminAssetEditorPage';
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
          <Route path="/" element={<HomePage />} />
          <Route path="/simulation" element={<SimulationProductPage />} />
          <Route path="/simulation/pricing" element={<SimulationPricingPage />} />
          <Route path="/simulation/access" element={<SimulationAccessPage />} />
          <Route path="/simulation/access/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/simulation/access/reset-password" element={<ResetPasswordPage />} />

          {/* Legacy auth/access route redirects */}
          <Route path="/login" element={<LegacyAccessRedirectPage target="signin" />} />
          <Route path="/register" element={<LegacyAccessRedirectPage target="signup" />} />
          <Route path="/verify-email" element={<LegacyAccessRedirectPage target="verify" />} />
          <Route path="/billing" element={<LegacyAccessRedirectPage target="membership" />} />
          <Route path="/forgot-password" element={<LegacyAccessRedirectPage target="forgot" />} />
          <Route path="/reset-password" element={<LegacyAccessRedirectPage target="reset" />} />

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

          <Route
            path="/frame-designer"
            element={
              <ProtectedRoute>
                <FrameDesignerPage />
              </ProtectedRoute>
            }
          />

          {/* Admin-only asset authoring flows */}
          <Route
            path="/admin/assets"
            element={
              <AdminRoute>
                <AdminAssetLibraryPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/assets/editor"
            element={
              <AdminRoute>
                <AdminAssetEditorPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/assets/editor/:assetId"
            element={
              <AdminRoute>
                <AdminAssetEditorPage />
              </AdminRoute>
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
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
