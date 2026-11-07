import { numberLocale } from "../i18n/runtime";
import { dateLocale } from "../i18n/runtime";
import { useLanguage as useUiLanguage } from "../contexts/LanguageContext";
import { tr, direction } from "../i18n/runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  AlertCircle,
  FileText,
  LayoutDashboard,
  RefreshCw,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Analytics from "../components/platform/Analytics";
import NotificationCenter from "../components/platform/NotificationCenter";
import {
  DashboardSummary,
  realEstateService,
} from "../services/realEstateService";
const number = (value: number) =>
  new Intl.NumberFormat(numberLocale(), { maximumFractionDigits: 2 }).format(
    value,
  );
const heroDate = (value: Date, language: string, calendar: string) =>
  new Intl.DateTimeFormat(language, {
    calendar,
    numberingSystem: "latn",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(calendar === "islamic-umalqura" ? { era: "short" as const } : {}),
    timeZone: "Asia/Riyadh",
  }).format(value);
const month = () =>
  new Intl.DateTimeFormat(dateLocale(), {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(new Date());
export default function Dashboard() {
  const { language } = useUiLanguage();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const hour = Number(
    new Intl.DateTimeFormat("en", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Riyadh",
    }).format(now),
  );
  const greeting = hour >= 5 && hour < 12 ? "Good morning," : "Good evening,";
  const weekday = new Intl.DateTimeFormat(language, {
    weekday: "long",
    timeZone: "Asia/Riyadh",
  }).format(now);
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await realEstateService.getDashboardSummary();
      if (mounted.current) {
        setSummary(result);
        setUpdatedAt(new Date());
      }
    } catch (e: unknown) {
      if (mounted.current) {
        const detail = (
          e as {
            response?: {
              data?: {
                detail?: unknown;
              };
            };
          }
        )?.response?.data?.detail;
        setError(
          typeof detail === "string"
            ? detail
            : tr(
                "Unable to load the dashboard. Check your connection and try again.",
              ),
        );
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);
  const net = summary
    ? summary.collected_this_month - summary.expenses_this_month
    : 0;
  const occupancy =
    summary && summary.units > 0
      ? Math.round((summary.occupied_units / summary.units) * 100)
      : null;
  const operations = summary
    ? [
        {
          get label() {
            return tr("Properties");
          },
          value: number(summary.properties),
          get caption() {
            return tr("Registered properties in your account");
          },
          href: "/properties",
          icon: Building2,
        },
        {
          get label() {
            return tr("Tenants");
          },
          value: number(summary.tenants),
          get caption() {
            return tr("Registered tenants");
          },
          href: "/tenants",
          icon: Users,
        },
        {
          get label() {
            return tr("Active contracts");
          },
          value: number(summary.active_contracts),
          get caption() {
            return tr("Active, unexpired contracts");
          },
          href: "/contracts",
          icon: FileText,
        },
        {
          get label() {
            return tr("Units");
          },
          value: number(summary.units),
          caption:
            "" +
            number(summary.occupied_units) +
            tr(" recorded occupied units"),
          href: "/properties",
          icon: LayoutDashboard,
        },
        {
          get label() {
            return tr("Contractual monthly rent");
          },
          value: "" + number(summary.monthly_rent_due) + tr(" SAR"),
          get caption() {
            return tr("Based on active contracts; not cash collected");
          },
          href: "/contracts",
          icon: Wallet,
        },
        {
          get label() {
            return tr("Meters");
          },
          value: number(summary.meters),
          get caption() {
            return tr("Registered meter");
          },
          href: "/calculation",
          icon: Zap,
        },
      ]
    : [];
  const financials = summary
    ? [
        {
          get title() {
            return tr("Collections");
          },
          value: summary.collected_this_month,
          get caption() {
            return tr("Rent payments recorded this month through today");
          },
          href: "/payments",
          icon: ArrowDownLeft,
          tone: "income",
        },
        {
          get title() {
            return tr("Expenses");
          },
          value: summary.expenses_this_month,
          get caption() {
            return tr("Property expenses recorded this month through today");
          },
          href: "/payments",
          icon: ArrowUpLeft,
          tone: "expense",
        },
        {
          get title() {
            return tr("Net cash movement");
          },
          value: net,
          get caption() {
            return tr("Recorded collections minus expenses");
          },
          href: "/reports",
          icon: Wallet,
          tone: "net",
        },
      ]
    : [];
  return (
    <div
      className="wameed-dashboard mx-auto max-w-7xl space-y-7"
      dir={direction()}
    >
      <header className="dashboard-hero relative overflow-hidden rounded-[1.75rem] px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DDB13B]/30 bg-[#DDB13B]/10">
                <Zap className="h-6 w-6 text-[#E9CD79]" aria-hidden="true" />
              </span>
              <span className="text-lg font-black tracking-wide">
                {" "}
                {tr("\u0648\u064E\u0645\u0650\u064A\u0636")}{" "}
                <span className="ms-2 text-xs tracking-[.22em] text-[#E9CD79]">
                  WAMEED
                </span>
              </span>
            </div>
            <p className="hero-greeting mb-3 text-lg font-semibold text-emerald-100 sm:text-xl">
              {tr(greeting)}{" "}
              <bdi>{user?.full_name || user?.username || tr("there")}</bdi>.
            </p>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl">
              {" "}
              {tr("Your property business at a glance")}{" "}
            </h1>
            <p
              className="mt-3 text-start text-xs tracking-[.13em] text-[#E9CD79] sm:text-sm"
              lang="en"
              dir="ltr"
            >
              {tr("Everything Under Control.")}
            </p>
          </div>
          <div className="hero-date rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-sm">
            <div className="mb-3 flex items-center gap-2 font-bold text-[#F6E8B7]">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
              <span>{weekday}</span>
            </div>
            <dl className="space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-xs text-white/60">{tr("Gregorian")}</dt>
                <dd className="font-medium">
                  {heroDate(now, language, "gregory")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-xs text-white/60">{tr("Hijri")}</dt>
                <dd className="font-medium">
                  {heroDate(now, language, "islamic-umalqura")}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">{tr("Financial overview")}</h2>
          <p className="dashboard-muted mt-1 text-sm">
            {month()}{" "}
            {tr("\u00B7 Through today \u00B7 From your actual records")}{" "}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {updatedAt && (
            <p className="dashboard-muted text-xs" role="status">
              {loading
                ? tr("Refreshing data\u2026")
                : error
                  ? tr("Showing the last successfully loaded data")
                  : "" +
                    tr("Last refreshed ") +
                    updatedAt.toLocaleTimeString(numberLocale(), {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Riyadh",
                    })}
            </p>
          )}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="dashboard-button inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {loading ? tr("Loading") : tr("Refresh data")}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="dashboard-error flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="font-bold">
                {" "}
                {tr("Unable to")} {summary ? tr("Refresh") : tr("Load")}{" "}
                {tr("Data")}{" "}
              </p>
              <p className="mt-1 text-sm">{tr(error)}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void refresh()}
            className="min-h-11 rounded-xl border border-current px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            {" "}
            {tr("Retry")}{" "}
          </button>
        </div>
      )}

      {!summary && loading && (
        <section
          aria-label={tr("Loading your dashboard")}
          role="status"
          aria-busy="true"
          className="space-y-5"
        >
          <span className="sr-only">{tr("Loading your dashboard")}</span>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="dashboard-panel animate-pulse rounded-2xl p-6"
              >
                <div className="dashboard-skeleton h-4 w-24 rounded" />
                <div className="dashboard-skeleton mt-6 h-9 w-36 rounded" />
                <div className="dashboard-skeleton mt-4 h-3 w-3/4 rounded" />
              </div>
            ))}
          </div>
          <div className="dashboard-panel h-56 animate-pulse rounded-2xl" />
        </section>
      )}

      {summary && (
        <div className="space-y-7" aria-busy={loading}>
          <section
            aria-label={tr("This month's financial metrics")}
            className="grid gap-4 md:grid-cols-3"
          >
            {financials.map(
              ({ title, value, caption, href, icon: Icon, tone }) => (
                <Link
                  to={href}
                  key={title}
                  className={`dashboard-finance dashboard-finance-${tone} group relative overflow-hidden rounded-2xl border p-6 transition hover:-translate-y-0.5`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold">{title}</h3>
                    <span className="dashboard-metric-icon flex h-10 w-10 items-center justify-center rounded-xl">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <strong
                      className="break-words text-3xl font-black tabular-nums"
                      dir="ltr"
                    >
                      {number(value)}
                    </strong>
                    <span className="text-xs opacity-70">{tr("SAR")}</span>
                  </p>
                  <p className="mt-3 text-xs leading-6 opacity-75">{caption}</p>
                  <span className="mt-5 flex items-center gap-2 text-xs font-bold">
                    {" "}
                    {tr("View")} {tone === "net" ? tr("Report") : tr("Records")}
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              ),
            )}
          </section>
          <p className="dashboard-muted flex items-start gap-2 text-xs leading-6">
            <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />{" "}
            {tr(
              "Financial figures reflect this month's recorded transactions. Contractual rent is shown separately from cash collected.",
            )}{" "}
          </p>

          {summary.properties === 0 && (
            <section className="dashboard-panel flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-dashed p-6">
              <div className="flex items-start gap-4">
                <span className="dashboard-icon rounded-xl p-3">
                  <Building2 className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-black">
                    {" "}
                    {tr(
                      "Your workspace is ready. Start with your properties.",
                    )}{" "}
                  </h2>
                  <p className="dashboard-muted mt-2 max-w-lg text-sm leading-7">
                    {" "}
                    {tr(
                      "Your account has no properties yet. Metrics will appear automatically as you add your actual records.",
                    )}{" "}
                  </p>
                </div>
              </div>
              <Link
                to="/properties"
                className="dashboard-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
              >
                {" "}
                {tr("Go to properties")}{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>
          )}

          <section aria-labelledby="portfolio-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="portfolio-heading" className="text-xl font-black">
                  {" "}
                  {tr("Your property portfolio")}{" "}
                </h2>
                <p className="dashboard-muted mt-1 text-sm">
                  {" "}
                  {tr("Your properties, units and contracts in one place")}{" "}
                </p>
              </div>
              <Link
                to="/properties"
                className="dashboard-link inline-flex min-h-11 items-center gap-2 text-sm font-bold"
              >
                {" "}
                {tr("Manage properties")}{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {operations.map(({ label, value, caption, href, icon: Icon }) => (
                <Link
                  key={label}
                  to={href}
                  className="dashboard-panel dashboard-interactive rounded-2xl border p-5 transition hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="dashboard-icon rounded-xl p-2.5">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="dashboard-muted text-sm font-bold">
                      {label}
                    </h3>
                  </div>
                  <p className="mt-4 break-words text-2xl font-black tabular-nums">
                    {value}
                  </p>
                  <p className="dashboard-muted mt-2 text-xs leading-6">
                    {caption}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <Analytics revision={updatedAt?.getTime()} />
          <NotificationCenter revision={updatedAt?.getTime()} />
          <section className="dashboard-panel rounded-2xl border p-5">
            <h2 className="font-black">{tr("Recorded unit occupancy")}</h2>
            <p className="dashboard-muted mt-3 text-sm">
              {number(summary.occupied_units)} {tr("occupied out of")}{" "}
              {number(summary.units)} {tr("units \u00B7")}{" "}
              {occupancy === null
                ? tr("Units not specified yet")
                : "" + number(occupancy) + tr("%")}
            </p>
            <p className="dashboard-muted mt-2 text-xs">
              {" "}
              {tr(
                "View linked unit occupancy on each property's page. Link legacy contracts to their actual units to complete the occupancy details.",
              )}{" "}
            </p>
          </section>
          <section className="dashboard-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5">
            <div>
              <h2 className="text-sm font-black">{tr("Your next task")}</h2>
              <p className="dashboard-muted mt-1 text-xs">
                {" "}
                {tr("Shortcuts for everyday work")}{" "}
              </p>
            </div>
            <nav
              aria-label={tr("Dashboard shortcuts")}
              className="flex flex-wrap gap-2"
            >
              {[
                {
                  to: "/payments",
                  get label() {
                    return tr("Collections & expenses");
                  },
                  icon: Wallet,
                },
                {
                  to: "/reports",
                  get label() {
                    return tr("Reports");
                  },
                  icon: FileText,
                },
                {
                  to: "/calculation",
                  get label() {
                    return tr("Meter calculator");
                  },
                  icon: Zap,
                },
              ].map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="dashboard-button inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </nav>
          </section>
        </div>
      )}
    </div>
  );
}
