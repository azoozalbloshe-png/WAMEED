import { FilterPanel } from "../components/platform/QuietSection";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bell,
  CalendarClock,
  FileClock,
  Wrench,
  RefreshCw,
  ArrowUpLeft,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { tr, direction, numberLocale } from "../i18n/runtime";
import { platform } from "../services/platform";
import {
  PageHead,
  Loading,
  Notice,
  Empty,
  useData,
  day,
  money,
} from "../components/platform/UI";
type Alert = {
  id: string;
  type: string;
  title: string;
  description: string;
  href: string;
  date: string | null;
  amount: number | null;
  property_id: number | null;
  property_name: string | null;
  days_until: number | null;
  is_overdue: boolean;
};
const groups: Record<string, string[]> = {
  payments: ["overdue", "due"],
  contracts: ["renewal", "expiring"],
  maintenance: ["maintenance"],
};
const supported = new Set(Object.values(groups).flat());
const groupFor = (type: string) =>
  Object.keys(groups).find((g) => groups[g].includes(type)) || "";
export default function Alerts() {
  useLanguage();
  const { data, error, loading, refresh } = useData(
    platform.followUpAlerts,
    [],
  );
  const [params, setParams] = useSearchParams();
  const group = Object.keys(groups).includes(params.get("category") || "")
    ? params.get("category")!
    : "all";
  const period = ["late", "today", "7", "30"].includes(
    params.get("period") || "",
  )
    ? params.get("period")!
    : "all";
  const property = params.get("property") || "";
  const query = params.get("q") || "";
  function filter(key: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (!value || value === "all") next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  }
  const items: Alert[] = useMemo(
    () => (data?.items || []).filter((a: Alert) => supported.has(a.type)),
    [data],
  );
  const properties = useMemo(
    () =>
      Array.from(
        new Map(
          items
            .filter((a) => a.property_id)
            .map((a) => [
              String(a.property_id),
              a.property_name || String(a.property_id),
            ]),
        ).entries(),
      ).sort((a, b) => a[1].localeCompare(b[1])),
    [items],
  );
  const visible = items
    .filter(
      (a) =>
        (group === "all" || groupFor(a.type) === group) &&
        (!property || String(a.property_id) === property) &&
        (!query ||
          `${a.title} ${tr(a.title)} ${a.description} ${a.property_name || ""}`
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase())) &&
        (period === "all" ||
          (a.days_until !== null &&
            (period === "late"
              ? a.days_until < 0
              : period === "today"
                ? a.days_until === 0
                : a.days_until >= 0 && a.days_until <= Number(period)))),
    )
    .sort(
      (a, b) =>
        Number(b.is_overdue) - Number(a.is_overdue) ||
        (a.date || "9999").localeCompare(b.date || "9999") ||
        a.id.localeCompare(b.id),
    );
  const count = (category: string) =>
    items.filter((a) => category === "all" || groupFor(a.type) === category)
      .length;
  return (
    <section
      className="quiet-workspace mx-auto max-w-7xl space-y-5"
      dir={direction()}
    >
      <PageHead
        icon={Bell}
        title={tr("Follow-up alerts")}
        description={tr(
          "Upcoming and overdue payments, contract renewals and maintenance follow-ups in one place.",
        )}
      >
        <button
          type="button"
          className="btn inline-flex items-center gap-2"
          disabled={loading}
          onClick={refresh}
        >
          <RefreshCw size={17} />
          {tr("Refresh alerts")}
        </button>
      </PageHead>
      <Notice message={tr(error)} error />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <p className="text-sm muted">
              {tr("Based on your saved records as of")} {day(data.as_of)}.{" "}
              {tr(
                "Payment alerts cover the next 7 days, contracts the next 30 days, and maintenance the next 7 days. Overdue records remain visible until resolved.",
              )}
            </p>
            <div
              className="grid grid-cols-2 gap-3 lg:grid-cols-4"
              role="group"
              aria-label={tr("Alert categories")}
            >
              {(
                [
                  ["all", "All alerts", Bell],
                  ["payments", "Payment follow-up", CalendarClock],
                  ["contracts", "Contract follow-up", FileClock],
                  ["maintenance", "Maintenance follow-up", Wrench],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  type="button"
                  key={key}
                  aria-pressed={group === key}
                  onClick={() => filter("category", key)}
                  className={`panel quiet-category min-w-0 p-3 text-start ${group === key ? "ring-2 ring-emerald-600" : ""}`}
                >
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <Icon size={18} className="shrink-0" />
                    {tr(label)}
                  </span>
                  <strong className="block text-lg">
                    {count(key).toLocaleString(numberLocale())}
                  </strong>
                </button>
              ))}
            </div>
            <FilterPanel
              search={
                <label className="space-y-1 text-sm font-bold">
                  <span>{tr("Search alerts")}</span>
                  <input
                    className="field w-full"
                    type="search"
                    value={query}
                    onChange={(e) => filter("q", e.target.value)}
                    placeholder={tr(
                      "Tenant, property, contract or maintenance request",
                    )}
                  />
                </label>
              }
              activeCount={Number(!!property) + Number(period !== "all")}
              onClear={() => {
                setParams(
                  (previous) => {
                    const next = new URLSearchParams(previous);
                    next.delete("property");
                    next.delete("period");
                    return next;
                  },
                  { replace: true },
                );
              }}
            >
              <label className="space-y-1 text-sm font-bold">
                <span>{tr("Property")}</span>
                <select
                  className="field w-full"
                  value={property}
                  onChange={(e) => filter("property", e.target.value)}
                >
                  <option value="">{tr("All properties")}</option>
                  {properties.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm font-bold">
                <span>{tr("Due date")}</span>
                <select
                  className="field w-full"
                  value={period}
                  onChange={(e) => filter("period", e.target.value)}
                >
                  <option value="all">{tr("All dates")}</option>
                  <option value="late">{tr("Overdue only")}</option>
                  <option value="today">{tr("Due today")}</option>
                  <option value="7">{tr("Next 7 days")}</option>
                  <option value="30">{tr("Next 30 days")}</option>
                </select>
              </label>
            </FilterPanel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p role="status" className="text-sm muted">
                {tr("Matching alerts")}:{" "}
                {visible.length.toLocaleString(numberLocale())}
              </p>
              {(group !== "all" || period !== "all" || property || query) && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setParams({}, { replace: true })}
                >
                  {tr("Clear filters")}
                </button>
              )}
            </div>
            {visible.length ? (
              <ul className="space-y-3">
                {visible.map((a) => (
                  <li key={a.id}>
                    <Link
                      to={a.href}
                      className="panel flex items-center justify-between gap-3 p-4 transition hover:border-emerald-600 sm:p-5"
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-black">
                            {tr(
                              a.type === "maintenance" && a.is_overdue
                                ? "Overdue maintenance request"
                                : a.title,
                            )}
                          </h2>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${a.is_overdue ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-700"}`}
                          >
                            {tr(
                              a.is_overdue
                                ? "Overdue"
                                : a.days_until === 0
                                  ? "Due today"
                                  : "Upcoming",
                            )}
                          </span>
                        </div>
                        <p className="muted break-words text-sm leading-6">
                          {tr(a.description)}
                          {a.type === "maintenance" && a.property_name
                            ? ` · ${a.property_name}`
                            : ""}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          {a.date && (
                            <time dateTime={a.date}>{day(a.date)}</time>
                          )}
                          {a.amount !== null && (
                            <strong>
                              {tr("Remaining amount")}: {money(a.amount)}
                            </strong>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          {tr(
                            a.type === "maintenance"
                              ? "Open maintenance request"
                              : "Open contract",
                          )}
                          <ArrowUpLeft
                            size={15}
                            className="rtl:rotate-0 ltr:rotate-90"
                          />
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>
                {tr(
                  items.length
                    ? "No alerts match these filters."
                    : "No payment, contract or maintenance alerts need follow-up right now.",
                )}
              </Empty>
            )}
            <p className="text-xs leading-6 muted">
              {tr(
                "Alerts update from your records. Recorded payments are allocated to the oldest installments first. Completing maintenance or updating a contract removes alerts when they no longer apply.",
              )}
            </p>
          </>
        )
      )}
      {!loading && error && (
        <button className="btn" onClick={refresh}>
          {tr("Retry")}
        </button>
      )}
    </section>
  );
}
