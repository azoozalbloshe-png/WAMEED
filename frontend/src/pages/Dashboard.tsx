
import CashTrend from "../components/platform/CashTrend";
import {
  numberLocale,
  dateLocale,
  tr,
  direction,
} from "../i18n/runtime";
import { useLanguage as useUiLanguage } from "../contexts/LanguageContext";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  AlertCircle,
  RefreshCw,
  Wallet,
  FilePlus2,
  Gauge,
  Plus,
  Users,
  Home,
  FileText,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../contexts/PermissionsContext";
import BrandLogo from "../components/brand/BrandLogo";
import NotificationCenter from "../components/platform/NotificationCenter";
import {
  DashboardSummary,
  realEstateService,
} from "../services/realEstateService";

const number = (value: number) =>
  new Intl.NumberFormat(numberLocale(), {
    maximumFractionDigits: 2,
  }).format(value);

const heroDate = (
  value: Date,
  language: string,
  calendar: string,
) =>
  new Intl.DateTimeFormat(language, {
    calendar,
    numberingSystem: "latn",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(calendar === "islamic-umalqura"
      ? { era: "short" as const }
      : {}),
    timeZone: "Asia/Riyadh",
  }).format(value);

const month = () =>
  new Intl.DateTimeFormat(dateLocale(), {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(new Date());

const upcomingDate = (value: string) =>
  new Intl.DateTimeFormat(dateLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(new Date(`${value}T12:00:00`));

export default function Dashboard() {
  const { language } = useUiLanguage();
  const { user } = useAuth();
  const { can } = usePermissions();

  const [now, setNow] = useState(() => new Date());
  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] =
    useState<Date | null>(null);

  const mounted = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(new Date()),
      60_000,
    );

    return () => window.clearInterval(timer);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result =
        await realEstateService.getDashboardSummary();

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
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();

    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  const hour = Number(
    new Intl.DateTimeFormat("en", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Riyadh",
    }).format(now),
  );

  const greeting =
    hour >= 5 && hour < 12
      ? "Good morning,"
      : "Good evening,";

  const weekday = new Intl.DateTimeFormat(language, {
    weekday: "long",
    timeZone: "Asia/Riyadh",
  }).format(now);

  const net = summary
    ? summary.collected_this_month -
      summary.expenses_this_month
    : 0;

  const shortcuts = [
    {
      title: "Record payment",
      href: "/payments?action=create",
      icon: Plus,
      allowed: can("payments", "create"),
    },
    {
      title: "Add contract",
      href: "/contracts?action=create",
      icon: FilePlus2,
      allowed: can("contracts", "create"),
    },
    {
      title: "Record meter reading",
      href: "/calculation",
      icon: Gauge,
      allowed: can("meters", "create"),
    },
  ].filter((item) => item.allowed);

  const statistics = summary
    ? [
        {
          title: "Properties",
          value: summary.properties,
          icon: Building2,
          href: "/properties",
          description: "Total registered properties",
        },
        {
          title: "Units",
          value: summary.units,
          icon: Home,
          href: "/properties",
          description: "Total property units",
        },
        {
          title: "Occupied units",
          value: summary.occupied_units,
          icon: CheckCircle2,
          href: "/properties",
          description: "Currently occupied units",
        },
        {
          title: "Tenants",
          value: summary.tenants,
          icon: Users,
          href: "/tenants",
          description: "Registered tenants",
        },
        {
          title: "Active contracts",
          value: summary.active_contracts,
          icon: FileText,
          href: "/contracts",
          description: "Currently active contracts",
        },
        {
          title: "Upcoming contracts",
          value: summary.upcoming_contracts.length,
          icon: Clock,
          href: "/contracts",
          description: "Contracts approaching expiry",
        },
      ]
    : [];

  const financials = summary
    ? [
        {
          title: "Collections",
          value: summary.collected_this_month,
          caption:
            "Rent payments recorded this month through today",
          href: "/payments",
          icon: ArrowDownLeft,
          tone: "income",
        },
        {
          title: "Expenses",
          value: summary.expenses_this_month,
          caption:
            "Property expenses recorded this month through today",
          href: "/payments",
          icon: ArrowUpLeft,
          tone: "expense",
        },
        {
          title: "Net cash movement",
          value: net,
          caption: "Recorded collections minus expenses",
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
      {/* Welcome */}
      <header className="dashboard-hero dashboard-welcome relative overflow-hidden rounded-3xl p-5 text-white sm:p-7">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <BrandLogo />
              <p className="hero-greeting text-sm font-semibold text-emerald-100">
                {tr(greeting)}{" "}
                <bdi>
                  {user?.full_name ||
                    user?.username ||
                    tr("there")}
                </bdi>
                .
              </p>
            </div>

            <h1 className="text-xl font-black leading-snug sm:text-2xl">
              {tr("Your property business at a glance")}
            </h1>

            <p className="max-w-xl text-sm leading-7 text-white/75">
              {tr(
                "Manage your properties, tenants, contracts and finances from one place.",
              )}
            </p>
          </div>

          <div className="dashboard-welcome-date flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/80">
            <div className="flex items-center gap-2 font-bold text-[var(--brand-on-dark)]">
              <CalendarDays
                className="h-4 w-4"
                aria-hidden="true"
              />
              <span>{weekday}</span>
            </div>

            <dl className="flex flex-wrap gap-x-4 gap-y-1">
              <div>
                <dt className="sr-only">
                  {tr("Gregorian")}
                </dt>
                <dd>
                  {heroDate(now, language, "gregory")}
                </dd>
              </div>

              <div>
                <dt className="sr-only">
                  {tr("Hijri")}
                </dt>
                <dd>
                  {heroDate(
                    now,
                    language,
                    "islamic-umalqura",
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      {/* Refresh and status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">
            {tr("Dashboard overview")}
          </h2>
          <p className="dashboard-muted mt-1 text-sm">
            {tr("Your property portfolio and business activity")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {updatedAt && (
            <p className="dashboard-muted text-xs" role="status">
              {loading
                ? tr("Refreshing data…")
                : error
                  ? tr("Showing the last successfully loaded data")
                  : tr("Last refreshed ") +
                    updatedAt.toLocaleTimeString(
                      numberLocale(),
                      {
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
              className={`h-4 w-4 ${
                loading ? "animate-spin" : ""
              }`}
              aria-hidden="true"
            />
            {loading
              ? tr("Loading")
              : tr("Refresh data")}
          </button>
        </div>
      </div>

      {/* Error */}
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
                {tr("Unable to")}{" "}
                {summary ? tr("Refresh") : tr("Load")}{" "}
                {tr("Data")}
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
            {tr("Retry")}
          </button>
        </div>
      )}

      {/* Loading */}
      {!summary && loading && (
        <section
          aria-label={tr("Loading your dashboard")}
          role="status"
          aria-busy="true"
          className="space-y-5"
        >
          <span className="sr-only">
            {tr("Loading your dashboard")}
          </span>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="dashboard-panel animate-pulse rounded-2xl p-5"
              >
                <div className="dashboard-skeleton h-4 w-24 rounded" />
                <div className="dashboard-skeleton mt-6 h-9 w-16 rounded" />
                <div className="dashboard-skeleton mt-4 h-3 w-3/4 rounded" />
              </div>
            ))}
          </div>
        </section>
      )}

      {summary && (
        <div className="space-y-8" aria-busy={loading}>
          {/* Portfolio statistics */}
          <section
            aria-labelledby="portfolio-title"
            className="space-y-4"
          >
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2
                  id="portfolio-title"
                  className="text-xl font-black"
                >
                  {tr("Portfolio overview")}
                </h2>
                <p className="dashboard-muted mt-1 text-sm">
                  {tr("A snapshot of your properties and leases")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {statistics.map(
                ({
                  title,
                  value,
                  icon: Icon,
                  href,
                  description,
                }) => (
                  <Link
                    to={href}
                    key={title}
                    className="dashboard-panel dashboard-interactive group rounded-2xl border p-4 transition hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="dashboard-icon flex h-10 w-10 items-center justify-center rounded-xl">
                        <Icon
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      </span>
                      <ArrowRight
                        className="h-4 w-4 opacity-40 transition group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </div>

                    <p className="mt-4 text-2xl font-black tabular-nums">
                      {number(value)}
                    </p>

                    <h3 className="mt-1 text-sm font-bold">
                      {tr(title)}
                    </h3>

                    <p className="dashboard-muted mt-1 text-xs leading-5">
                      {tr(description)}
                    </p>
                  </Link>
                ),
              )}
            </div>
          </section>

          {/* Financial overview */}
          <section
            aria-labelledby="financial-title"
            className="space-y-4"
          >
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2
                  id="financial-title"
                  className="text-xl font-black"
                >
                  {tr("Financial overview")}
                </h2>
                <p className="dashboard-muted mt-1 text-sm">
                  {month()} ·{" "}
                  {tr("Through today · From your actual records")}
                </p>
              </div>

              <Link
                to="/reports"
                className="dashboard-link inline-flex items-center gap-2 text-sm font-bold"
              >
                {tr("View reports")}
                <ArrowRight
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {financials.map(
                ({
                  title,
                  value,
                  caption,
                  href,
                  icon: Icon,
                  tone,
                }) => (
                  <Link
                    to={href}
                    key={title}
                    className={`dashboard-finance dashboard-finance-${tone} group relative overflow-hidden rounded-2xl border p-4 transition hover:-translate-y-0.5 sm:p-5 ${
                      tone === "net"
                        ? "col-span-2 md:col-span-1"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold">
                        {tr(title)}
                      </h3>

                      <span className="dashboard-metric-icon flex h-10 w-10 items-center justify-center rounded-xl">
                        <Icon
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      </span>
                    </div>

                    <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <strong
                        className="break-words text-2xl font-black tabular-nums sm:text-3xl"
                        dir="ltr"
                      >
                        {number(value)}
                      </strong>
                      <span className="text-xs opacity-70">
                        {tr("SAR")}
                      </span>
                    </p>

                    <p className="mt-2 text-xs leading-5 opacity-75">
                      {tr(caption)}
                    </p>

                    <span className="mt-3 flex items-center gap-2 text-xs font-bold">
                      {tr("View")}{" "}
                      {tone === "net"
                        ? tr("Report")
                        : tr("Records")}
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                ),
              )}
            </div>
          </section>

          {/* Cash trend */}
          {can("contracts") &&
            can("payments") &&
            can("expenses") && (
              <CashTrend
                revision={updatedAt?.getTime() || 0}
              />
            )}

          {/* Upcoming contracts */}
          {can("contracts") && (
            <section
              aria-labelledby="upcoming-title"
              className="dashboard-panel overflow-hidden rounded-2xl border"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b dashboard-divider p-5">
                <div>
                  <h2
                    id="upcoming-title"
                    className="text-lg font-black"
                  >
                    {tr("Upcoming contract expirations")}
                  </h2>
                  <p className="dashboard-muted mt-1 text-sm">
                    {tr("Contracts approaching their end date")}
                  </p>
                </div>

                <Link
                  to="/contracts"
                  className="dashboard-link text-sm font-bold"
                >
                  {tr("View all")}
                </Link>
              </div>

              {summary.upcoming_contracts.length > 0 ? (
                <div className="divide-y dashboard-divider">
                  {summary.upcoming_contracts.map(
                    (contract) => (
                      <div
                        key={contract.id}
                        className="dashboard-row flex flex-wrap items-center justify-between gap-3 p-4 transition sm:px-5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="dashboard-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                            <FileText
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {contract.tenant}
                            </p>
                            <p className="dashboard-muted mt-1 truncate text-xs">
                              {contract.property}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold">
                          <CalendarDays
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                          <span>
                            {upcomingDate(contract.end_date)}
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="px-5 py-8 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 dashboard-positive" />
                  <p className="mt-3 text-sm font-bold">
                    {tr("No upcoming contract expirations")}
                  </p>
                  <p className="dashboard-muted mt-1 text-xs">
                    {tr("There are no upcoming contracts to display")}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Notifications and quick actions */}
      <div
        className={`grid items-start gap-6 ${
          shortcuts.length
            ? "lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]"
            : ""
        }`}
      >
        <NotificationCenter revision={updatedAt?.getTime()} />

        {shortcuts.length > 0 && (
          <section
            aria-labelledby="quick-actions-title"
            className="space-y-4"
          >
            <h2
              id="quick-actions-title"
              className="text-xl font-black"
            >
              {tr("Quick actions")}
            </h2>

            <div className="dashboard-panel space-y-2 rounded-2xl border p-3">
              {shortcuts.map(
                ({ title, href, icon: Icon }) => (
                  <Link
                    key={href}
                    to={href}
                    className="dashboard-action dashboard-row flex min-h-16 items-center gap-3 rounded-xl p-3 transition"
                  >
                    <span className="dashboard-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                      <Icon
                        size={20}
                        aria-hidden="true"
                      />
                    </span>

                    <span className="flex-1 text-sm font-bold">
                      {tr(title)}
                    </span>

                    <ArrowRight
                      size={17}
                      className="shrink-0 rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </Link>
                ),
              )}
            </div>
          </section>
        )}
      </div>

      {/* Empty properties */}
      {summary && summary.properties === 0 && (
        <section className="dashboard-panel flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-dashed p-6">
          <div className="flex items-start gap-4">
            <span className="dashboard-icon rounded-xl p-3">
              <Building2
                className="h-6 w-6"
                aria-hidden="true"
              />
            </span>

            <div>
              <h2 className="font-black">
                {tr(
                  "Your workspace is ready. Start with your properties.",
                )}
              </h2>

              <p className="dashboard-muted mt-2 max-w-lg text-sm leading-7">
                {tr(
                  "Your account has no properties yet. Metrics will appear automatically as you add your actual records.",
                )}
              </p>
            </div>
          </div>

          <Link
            to="/properties"
            className="dashboard-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
          >
            {tr("Go to properties")}
            <ArrowRight
              className="h-4 w-4"
              aria-hidden="true"
            />
          </Link>
        </section>
      )}
    </div>
  );
}
