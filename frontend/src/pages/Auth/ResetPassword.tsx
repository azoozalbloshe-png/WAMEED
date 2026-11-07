import PasswordInput from "../../components/platform/PasswordInput";
import AuthLayout, { AuthHeader } from "../../components/brand/AuthLayout";
import { useLanguage as useUiLanguage } from "../../contexts/LanguageContext";
import { tr } from "../../i18n/runtime";
import { useState } from "react";
import {
  Link,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import api from "../../services/api";
import { clearAuthSession } from "../../services/authService";
export default function ResetPassword() {
  useUiLanguage();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const resetToken =
    params.get("token") ||
    (
      location.state as {
        resetToken?: string;
      } | null
    )?.resetToken;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <AuthLayout>
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== confirm) {
            setMessage(tr("Passwords do not match"));
            return;
          }
          if (new TextEncoder().encode(password).length > 72) {
            setMessage(tr("Password is too long. Use a shorter password."));
            return;
          }
          setBusy(true);
          try {
            await api.post("/api/auth/reset-password", {
              token: resetToken,
              new_password: password,
            });
            setDone(true);
            setPassword("");
            setConfirm("");
            setMessage(
              tr(
                "Password updated and previous sessions revoked. Sign in with your new password.",
              ),
            );
            clearAuthSession();
            window.dispatchEvent(new Event("wameed:auth-invalid"));
            navigate("/reset-password", { replace: true, state: null });
          } catch {
            setMessage(
              tr(
                "The link is invalid or expired, or the new password does not meet the requirements.",
              ),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <AuthHeader title={tr("Set a new password")} />
        {message && (
          <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm">
            {tr(message)}
          </p>
        )}
        {!done && !resetToken ? (
          <p className="text-sm text-amber-200">
            {" "}
            {tr(
              "Open your email recovery link or verify your phone recovery code first.",
            )}{" "}
            <Link className="underline" to="/forgot-password">
              {" "}
              {tr("New recovery request")}{" "}
            </Link>
          </p>
        ) : (
          !done && (
            <>
              <label className="block">
                {" "}
                {tr("New password")}{" "}
                <PasswordInput
                  required
                  minLength={10}
                  maxLength={72}

                  autoComplete="new-password"
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <p className="text-xs auth-muted">
                {" "}
                {tr("Use at least 10 characters.")}{" "}
              </p>
              <label className="block">
                {" "}
                {tr("Confirm password")}{" "}
                <PasswordInput
                  required
                  minLength={10}

                  autoComplete="new-password"
                  className="auth-input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
              <button disabled={busy} className="auth-primary">
                {busy ? tr("Saving\u2026") : tr("Save password")}
              </button>
            </>
          )
        )}
        <Link className="block text-center font-bold auth-link" to="/login">
          {" "}
          {tr("Back to sign in")}{" "}
        </Link>
      </form>
    </AuthLayout>
  );
}
