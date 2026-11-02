import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const user = authService.getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function AdminRoute({ children }: { children: JSX.Element }) {
  const user = authService.getCurrentUser();
  if (!user || user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
