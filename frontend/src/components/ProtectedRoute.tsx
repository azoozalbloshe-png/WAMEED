import { useLanguage as useUiLanguage } from "../contexts/LanguageContext";
import { tr } from "../i18n/runtime";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
export function ProtectedRoute({ children }: { children: JSX.Element }) {
  useUiLanguage();
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="p-6 text-center" role="status">
        {" "}
        {tr("Checking your session\u2026")}{" "}
      </div>
    );
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
export function AdminRoute({ children }: { children: JSX.Element }) {
  useUiLanguage();
  const { user, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="p-6 text-center" role="status">
        {" "}
        {tr("Checking your session\u2026")}{" "}
      </div>
    );
  // Check for super_admin role
if (!user || user.role !== "super_admin") {
  return <Navigate to="/" replace />;
}  return children;
}
