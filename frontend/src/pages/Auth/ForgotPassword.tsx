import AuthLayout, { AuthHeader } from "../../components/brand/AuthLayout";
import { useLanguage as useUiLanguage } from "../../contexts/LanguageContext";
import { tr } from "../../i18n/runtime";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  MessageCircle,
  MessageSquare,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import api from "../../services/api";
type Method = "email" | "sms" | "whatsapp";
type Availability = Record<Method, boolean>;
const methods = [
  {
    id: "email" as Method,
    get name() {
      return tr("Email address");
    },
    get note() {
      return tr("Code sent to your registered email");
    },
    icon: Mail,
  },
  {
    id: "sms" as Method,
    get name() {
      return tr("Text message (SMS)");
    },
    get note() {
      return tr("Code sent to your verified phone");
    },
    icon: MessageSquare,
  },
  {
    id: "whatsapp" as Method,
    get name() {
      return tr("WhatsApp");
    },
    get note() {
      return tr("WhatsApp code sent to your verified phone");
    },
    icon: MessageCircle,
  },
];
const button = "auth-primary";
const errorText = (e: any) =>
  typeof e?.response?.data?.detail === "string"
    ? e.response.data.detail
    : tr("Unable to complete this action. Check your details and try again.");
const normalizePhone = (value: string) =>
  value
    .replace(/[٠-٩]/g, (x) => String("٠١٢٣٤٥٦٧٨٩".indexOf(x)))
    .replace(/[\s()-]/g, "");
export default function ForgotPassword() {
  useUiLanguage();
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>("email");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [requestId, setRequestId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    api
      .get<Availability>("/api/auth/recovery-options")
      .then(setAvailability)
      .catch(() =>
        setError(
          tr("Unable to load recovery methods. Refresh the page to try again."),
        ),
      )
      .finally(() => setLoadingOptions(false));
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const available = availability?.[method] === true;
  const changeMethod = (next: Method) => {
    setMethod(next);
    setRequestId("");
    setCode("");
    setError("");
    setMessage("");
  };
  async function send(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.post<{
        message: string;
        request_id: string;
      }>(
        "/api/auth/forgot-password",
        method === "email"
          ? { method, email: email.trim() }
          : { method, phone: normalizePhone(phone) },
      );
      setMessage(result.message);
      setRequestId(result.request_id);
      setCode("");
      setRetryAt(Date.now() + 60000);
    } catch (e: any) {
      setError(errorText(e));
      if (e?.response?.status === 429) setRetryAt(Date.now() + 60000);
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.post<{
        reset_token: string;
      }>("/api/auth/recovery/verify", { request_id: requestId, code });
      navigate("/reset-password", {
        replace: true,
        state: { resetToken: result.reset_token },
      });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <AuthHeader
        title={tr("Forgot password?")}
        description={tr(
          "Choose a recovery method using the contact details registered to your account.",
        )}
      />
      <fieldset disabled={busy} className="space-y-3">
        <legend className="mb-3 font-bold">{tr("Recovery method")}</legend>
        {methods.map(({ id, name, note, icon: Icon }) => (
          <label
            key={id}
            className={`grid grid-cols-[16px_22px_minmax(0,1fr)] cursor-pointer items-center gap-x-3 gap-y-1 rounded-2xl border p-4 ${method === id ? "auth-recovery-selected" : "auth-recovery-option"}`}
          >
            <input
              type="radio"
              name="recovery-method"
              value={id}
              checked={method === id}
              onChange={() => changeMethod(id)}
            />
            <Icon className="shrink-0 text-amber-400" size={22} />
            <span className="flex-1">
              <strong className="block text-sm">{name}</strong>
              <span className="text-xs auth-muted">{note}</span>
            </span>
            {!loadingOptions && availability && !availability[id] && (
              <span className="col-start-3 text-xs text-amber-300">
                {" "}
                {tr("Currently unavailable")}{" "}
              </span>
            )}
          </label>
        ))}
      </fieldset>
      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"
        >
          {tr(message)}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {tr(error)}
        </p>
      )}
      {loadingOptions ? (
        <p className="text-center text-sm">
          {tr("Loading recovery methods\u2026")}
        </p>
      ) : !available ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          {" "}
          {tr(
            "This method is currently unavailable. Choose another method or contact the platform administrator.",
          )}{" "}
        </p>
      ) : (
        <>
          {!requestId ? (
            <form onSubmit={send} className="space-y-4">
              {method === "email" ? (
                <label className="block text-sm font-bold">
                  {" "}
                  {tr("Your registered email address")}{" "}
                  <input
                    className="auth-input"
                    type="email"
                    autoComplete="email"
                    required
                    dir="ltr"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              ) : (
                <label className="block text-sm font-bold">
                  {" "}
                  {tr("Your registered and verified phone number")}{" "}
                  <input
                    className="auth-input"
                    type="tel"
                    lang="en"
                    autoComplete="tel"
                    required
                    dir="ltr"
                    placeholder="+9665xxxxxxxx"
                    pattern="\+[1-9][0-9]{7,14}"
                    value={phone}
                    onChange={(e) => setPhone(normalizePhone(e.target.value))}
                  />
                  <span className="mt-2 block text-xs font-normal auth-muted">
                    {" "}
                    {tr(
                      "Include the country code, such as +966. The number must have been verified in Settings.",
                    )}{" "}
                  </span>
                </label>
              )}
              <button className={button} disabled={busy || seconds > 0}>
                {busy ? <Loader2 className="animate-spin" size={18} /> : null}
                {seconds > 0
                  ? "" + tr("Try again in ") + seconds + tr(" seconds")
                  : tr("Send recovery code")}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <form onSubmit={verify} className="space-y-4">
                <label className="block text-sm font-bold">
                  {" "}
                  {tr("Recovery code")}{" "}
                  <input
                    autoFocus
                    className="auth-input"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    pattern={method === "email" ? "[0-9]{6}" : "[0-9]{4,10}"}
                    maxLength={method === "email" ? 6 : 10}
                    placeholder={tr("Enter code")}
                    value={code}
                    onChange={(e) =>
                      setCode(
                        e.target.value.replace(/[٠-٩]/g, (x) =>
                          String("٠١٢٣٤٥٦٧٨٩".indexOf(x)),
                        ),
                      )
                    }
                  />
                </label>
                <p className="text-xs auth-muted">
                  {" "}
                  {tr(
                    "The code expires in 10 minutes. You have 5 verification attempts.",
                  )}{" "}
                </p>
                <button className={button} disabled={busy}>
                  {busy
                    ? tr("Verifying\u2026")
                    : tr("Verify code and continue")}
                </button>
              </form>
              <button
                type="button"
                className="w-full text-sm font-bold auth-link underline disabled:opacity-50"
                disabled={busy || seconds > 0}
                onClick={() => void send()}
              >
                {seconds > 0
                  ? "" + tr("Resend in ") + seconds + tr(" seconds")
                  : tr("Resend")}
              </button>
              <button
                type="button"
                disabled={busy}
                className="w-full text-sm auth-muted underline"
                onClick={() => {
                  setRequestId("");
                  setCode("");
                  setMessage("");
                  setError("");
                }}
              >
                {" "}
                {tr("Edit contact details")}{" "}
              </button>
            </div>
          )}
        </>
      )}
      <Link
        className="flex items-center justify-center gap-2 border-t pt-4 text-sm font-bold auth-link"
        to="/login"
      >
        <ArrowLeft size={16} />
        {tr("Back to sign in")}{" "}
      </Link>
    </AuthLayout>
  );
}
