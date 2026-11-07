import AuthLayout, { AuthHeader } from "../components/brand/AuthLayout";
import { useLanguage as useUiLanguage } from "../contexts/LanguageContext";
import { tr } from "../i18n/runtime";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
type State = {
  email: string;
  phone: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  email_available: boolean;
  phone_available: boolean;
};
const button =
  "rounded-xl bg-[var(--brand-nav)] px-4 py-3 text-white disabled:opacity-50";
export function VerifyEmail() {
  useUiLanguage();
  const [params] = useSearchParams();
  const [message, setMessage] = useState(
    tr("Confirm your email address below."),
  );
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <AuthLayout>
      <AuthHeader title={tr("WAMEED \u2014 Verify email")} />
      <p role="status">{tr(message)}</p>
      <button
        className="auth-primary"
        disabled={busy || done || !params.get("token")}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await api.post<{
              message: string;
            }>("/api/verification/email/confirm", {
              token: params.get("token"),
            });
            setMessage(r.message);
            setDone(true);
          } catch {
            setMessage(
              tr(
                "This link is invalid or expired. Request a new one in Settings.",
              ),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {" "}
        {tr("Verify email")}{" "}
      </button>
      <Link className="block" to="/settings">
        {" "}
        {tr("Back to account")}{" "}
      </Link>
    </AuthLayout>
  );
}
export default function Verification() {
  useUiLanguage();
  const [state, setState] = useState<State | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () =>
    api.get<State>("/api/verification/status").then((s) => {
      setState(s);
      setPhone(s.phone || "");
    });
  useEffect(() => {
    load().catch(() => setMessage(tr("Unable to load verification status")));
  }, []);
  async function run(
    fn: () => Promise<{
      message: string;
    }>,
  ) {
    setBusy(true);
    try {
      const r = await fn();
      setMessage(r.message);
      await load();
    } catch (e: any) {
      setMessage(
        typeof e?.response?.data?.detail === "string"
          ? e.response.data.detail
          : tr("Unable to complete this action"),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="space-y-4 rounded-2xl bg-white p-6 text-slate-900">
      <h2 className="font-bold">{tr("Email & phone verification")}</h2>
      {message && <p role="status">{tr(message)}</p>}
      {state && (
        <>
          <p>
            {" "}
            {tr("Email:")} {state.email} —{" "}
            {state.email_verified ? tr("Verified") : tr("Unverified")}
          </p>
          <button
            className={button}
            disabled={busy || state.email_verified || !state.email_available}
            onClick={() =>
              void run(() => api.post("/api/verification/email/send"))
            }
          >
            {" "}
            {tr("Send verification email")}{" "}
          </button>
          {!state.email_available && (
            <p className="text-sm text-amber-800">
              {" "}
              {tr("Email delivery has not been configured")}{" "}
            </p>
          )}
          <p>
            {" "}
            {tr("Phone:")} {state.phone || tr("Not registered")} —{" "}
            {state.phone_verified ? tr("Verified") : tr("Unverified")}
          </p>
          <form
            className="flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() =>
                api.post("/api/verification/phone/send", { phone }),
              );
            }}
          >
            <input
              aria-label={tr("Phone number including country code")}
              dir="ltr"
              className="rounded-xl border p-3"
              placeholder="+9665xxxxxxxx"
              pattern="\+[1-9][0-9]{7,14}"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button
              className={button}
              disabled={busy || !state.phone_available}
            >
              {" "}
              {tr("Send code")}{" "}
            </button>
          </form>
          <form
            className="flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() =>
                api.post("/api/verification/phone/confirm", { code }),
              );
            }}
          >
            <input
              aria-label={tr("Phone verification code")}
              className="rounded-xl border p-3"
              placeholder={tr("Verification code")}
              inputMode="numeric"
              pattern="[0-9]{4,10}"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              className={button}
              disabled={busy || !state.phone_available}
            >
              {" "}
              {tr("Verify phone")}{" "}
            </button>
          </form>
          {!state.phone_available && (
            <p className="text-sm text-amber-800">
              {" "}
              {tr("Messaging has not been configured")}{" "}
            </p>
          )}
        </>
      )}
    </article>
  );
}
