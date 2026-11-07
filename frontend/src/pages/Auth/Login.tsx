import PasswordInput from "../../components/platform/PasswordInput";
import AuthLayout, { AuthHeader } from "../../components/brand/AuthLayout";
import { useLanguage as useUiLanguage } from "../../contexts/LanguageContext";
import { tr } from "../../i18n/runtime";
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { LogIn, Loader2 } from "lucide-react";
export default function Login() {
  useUiLanguage();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(identifier.trim(), password, rememberMe);
      // All authenticated users land on a route that is actually registered.
      navigate("/dashboard");
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        tr("Unable to sign in. Check your email or username and password.");
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <AuthLayout>
      <AuthHeader
        title={tr("Sign in")}
        description={tr("Welcome back! Enter your details to continue.")}
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-xl mb-6 text-sm text-center">
          {tr(error)}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label
            htmlFor="login-identifier"
            className="block auth-label text-sm font-medium mb-2"
          >
            {" "}
            {tr("Email or username")}{" "}
          </label>
          <input
            id="login-identifier"
            name="username"
            autoComplete="username"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            className="auth-input"
            placeholder="name@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block auth-label text-sm font-medium mb-2"
          >
            {" "}
            {tr("Password")}{" "}
          </label>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="auth-input"
            placeholder={tr("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022")}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center auth-label cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded bg-[var(--brand-nav)] border-gray-700 text-[var(--brand-on-dark)] focus:ring-0 me-2"
            />{" "}
            {tr("Remember me")}{" "}
          </label>
          <Link to="/forgot-password" className="auth-link hover:underline">
            {" "}
            {tr("Forgot password?")}{" "}
          </Link>
        </div>

        <button type="submit" disabled={isLoading} className="auth-primary">
          {isLoading ? (
            <>
              <Loader2 className="animate-spin me-2" size={20} />
              {tr("Signing in\u2026")}{" "}
            </>
          ) : (
            <>
              <LogIn className="me-2" size={20} />
              {tr("Sign in")}{" "}
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm auth-muted">
        {" "}
        {tr("Don't have an account?")}{" "}
        <Link to="/register" className="font-medium auth-link hover:underline">
          {" "}
          {tr("Create an account")}{" "}
        </Link>
      </p>
    </AuthLayout>
  );
}
