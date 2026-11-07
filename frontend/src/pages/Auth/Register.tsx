import PasswordInput from "../../components/platform/PasswordInput";
import AuthLayout, { AuthHeader } from "../../components/brand/AuthLayout";
import { useLanguage as useUiLanguage } from "../../contexts/LanguageContext";
import { tr } from "../../i18n/runtime";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { CheckCircle, Loader2, UserPlus } from "lucide-react";
// Static translations to avoid require in browser
const translations = {
  en: {
    register: {
      get title() {
        return tr("Create Account");
      },
      get welcome() {
        return tr("Join us today and get started");
      },
      get username() {
        return tr("Username");
      },
      get usernamePlaceholder() {
        return tr("johndoe");
      },
      get email() {
        return tr("Email");
      },
      get password() {
        return tr("Password");
      },
      get passwordPlaceholder() {
        return tr("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022");
      },
      get confirmPassword() {
        return tr("Confirm Password");
      },
      get createAccount() {
        return tr("Create Account");
      },
      get creatingAccount() {
        return tr("Creating account...");
      },
      get alreadyHaveAccount() {
        return tr("Already have an account?");
      },
      get signIn() {
        return tr("Sign in");
      },
      get passwordsDoNotMatch() {
        return tr("Passwords do not match");
      },
      get passwordMinLength() {
        return tr("Password must be at least 10 characters");
      },
      get accountCreated() {
        return tr("Account Created!");
      },
      get redirecting() {
        return tr("You will be redirected to your dashboard shortly...");
      },
      get failedToCreate() {
        return tr("Failed to create account. Please try again.");
      },
    },
  },
  ar: {
    register: {
      get title() {
        return tr("Create account");
      },
      get welcome() {
        return tr("Create your account and get started");
      },
      get username() {
        return tr("Username");
      },
      get usernamePlaceholder() {
        return tr("johndoe");
      },
      get email() {
        return tr("Email address");
      },
      get password() {
        return tr("Password");
      },
      get passwordPlaceholder() {
        return tr("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022");
      },
      get confirmPassword() {
        return tr("Confirm password");
      },
      get createAccount() {
        return tr("Create account");
      },
      get creatingAccount() {
        return tr("Creating account\u2026");
      },
      get alreadyHaveAccount() {
        return tr("Already have an account?");
      },
      get signIn() {
        return tr("Sign in");
      },
      get passwordsDoNotMatch() {
        return tr("Passwords do not match");
      },
      get passwordMinLength() {
        return tr("Password must contain at least 10 characters");
      },
      get accountCreated() {
        return tr("Account created!");
      },
      get redirecting() {
        return tr("You will be redirected to your dashboard shortly\u2026");
      },
      get failedToCreate() {
        return tr("Unable to create your account. Please try again.");
      },
    },
  },
};
export default function Register() {
  useUiLanguage();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = (key: string) => {
    const keys = key.split(".");
    let value: any =
      translations[language as keyof typeof translations] || translations.en;
    keys.forEach((k) => (value = value?.[k]));
    return value || key;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError(t("register.passwordsDoNotMatch"));
      return;
    }
    if (password.length < 10) {
      setError(t("register.passwordMinLength"));
      return;
    }
    setIsLoading(true);
    try {
      await register(email, username, password, phone);
      setSuccess(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err) {
      setError(t("register.failedToCreate"));
    } finally {
      setIsLoading(false);
    }
  };
  if (success) {
    return (
      <AuthLayout compact>
        <div className="text-center">
          <AuthHeader title={tr("Account Created!")} />
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
            <CheckCircle className="text-green-600 " size={32} />
          </div>
          <p className="auth-muted ">
            {tr("You will be redirected to your dashboard shortly...")}
          </p>
          <Loader2
            className="animate-spin mx-auto mt-6 text-amber-400"
            size={32}
          />
        </div>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout compact>
      <AuthHeader
        title={tr("Create Account")}
        description={tr("Join us today and get started")}
      />

      <form onSubmit={handleSubmit} className="auth-register-form">
        <label className="col-span-2 block text-sm font-medium">
          {language === "ar"
            ? tr("Phone number (optional)")
            : "Mobile number (optional)"}
          <input
            type="tel"
            lang="en"
            dir="ltr"
            autoComplete="tel"
            pattern="\+[1-9][0-9]{7,14}"
            placeholder="+9665xxxxxxxx"
            className="auth-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[\s()-]/g, ""))}
          />
          <span className="mt-1 block text-xs auth-muted">
            {language === "ar"
              ? "يمكنك تأكيد رقمك لاحقًا من الإعدادات."
              : "Verify your number later in Settings."}
          </span>
        </label>
        {error && (
          <div className="col-span-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-600 dark:text-red-400 text-sm">
              {tr(error)}
            </p>
          </div>
        )}

        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium auth-label"
          >
            {tr("Username")}
          </label>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="auth-input"
            placeholder={tr("johndoe")}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium auth-label"
          >
            {t("register.email")}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            placeholder={tr("you@example.com")}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium auth-label"
          >
            {t("register.password")}
          </label>
          <PasswordInput
            id="password"

            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            placeholder={tr("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022")}
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium auth-label"
          >
            {t("register.confirmPassword")}
          </label>
          <PasswordInput
            id="confirmPassword"

            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="auth-input"
            placeholder={tr("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022")}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="auth-primary col-span-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin me-2" size={20} />
              {t("register.creatingAccount")}
            </>
          ) : (
            <>
              <UserPlus className="me-2" size={20} />
              {t("register.createAccount")}
            </>
          )}
        </button>
      </form>

      <p className="mt-6 flex flex-wrap items-center justify-center gap-1 text-center text-sm auth-muted">
        {t("register.alreadyHaveAccount")}
        <Link to="/login" className="font-medium auth-link ">
          {t("register.signIn")}
        </Link>
      </p>
    </AuthLayout>
  );
}
