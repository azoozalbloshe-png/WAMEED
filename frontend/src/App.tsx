import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/layout/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { lazy, Suspense } from "react";
import { Loading } from "./components/platform/UI";
const AlertsPage = lazy(() => import("./pages/Alerts"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Auth/Login"));
const Register = lazy(() => import("./pages/Auth/Register"));
const MeterCalculation = lazy(() => import("./pages/MeterCalculation"));
const Properties = lazy(() => import("./pages/Properties"));
const Developer = lazy(() => import("./pages/Developer"));
const ResetPassword = lazy(() => import("./pages/Auth/ResetPassword"));
const ForgotPassword = lazy(() => import("./pages/Auth/ForgotPassword"));
const EntityDetails = lazy(() => import("./pages/EntityDetails"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const VerifyEmail = lazy(() =>
  import("./pages/Verification").then((m) => ({ default: m.VerifyEmail })),
);
const TenantsPage = lazy(() =>
  import("./pages/BusinessLists").then((m) => ({ default: m.TenantsPage })),
);
const ContractsPage = lazy(() =>
  import("./pages/BusinessLists").then((m) => ({ default: m.ContractsPage })),
);
const PaymentsPage = lazy(() => import("./pages/PaymentsFinances"));
const ReportsPage = lazy(() => import("./pages/ReportCenter"));
const SettingsPage = lazy(() =>
  import("./pages/OperationsPages").then((m) => ({ default: m.SettingsPage })),
);
export function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <PermissionsProvider>
            <Router
              future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
            >
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route
                    path="/properties/:id"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <EntityDetails kind="property" />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/units/:id"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <EntityDetails kind="unit" />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tenants/:id"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <EntityDetails kind="tenant" />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/contracts/:id"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <EntityDetails kind="contract" />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/alerts" element={<ProtectedRoute><Layout><AlertsPage /></Layout></ProtectedRoute>} />
                  <Route
                    path="/maintenance"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Maintenance />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/developer"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Developer />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/developer/users/:id"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Developer />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route
                    path="/"
                    element={
                      <Layout>
                        <Home />
                      </Layout>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Dashboard />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/properties"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Properties />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calculation"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <MeterCalculation />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tenants"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <TenantsPage />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/contracts"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <ContractsPage />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payments"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <PaymentsPage />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <ReportsPage />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <SettingsPage />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Routes>
              </Suspense>
            </Router>
          </PermissionsProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
export default App;
