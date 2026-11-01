import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Layout from './components/layout/Layout';import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import MeterCalculation from './pages/MeterCalculation';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* الصفحات الأساسية */}
              <Route path="/" element={<Layout><Home /></Layout>} />
              <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
              <Route path="/properties" element={<Layout><Properties /></Layout>} />
              <Route path="/calculation" element={<Layout><MeterCalculation /></Layout>} />

              {/* تحويل مؤقت لبقية الأقسام */}
              <Route path="/tenants" element={<Layout><Dashboard /></Layout>} />
              <Route path="/contracts" element={<Layout><Dashboard /></Layout>} />
              <Route path="/payments" element={<Layout><Dashboard /></Layout>} />
              <Route path="/reports" element={<Layout><Dashboard /></Layout>} />
              <Route path="/settings" element={<Layout><Dashboard /></Layout>} />

              {/* صفحات المصادقة */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* التوجيه الافتراضي */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
