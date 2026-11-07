import { useLanguage } from "../../contexts/LanguageContext";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ArrowRight } from "lucide-react";
import { platform } from "../../services/platform";
import { Loading, Notice, useData, money, day } from "./UI";

const actionableTypes = new Set([
  "overdue",
  "renewal",
  "expiring",
  "due",
  "maintenance",
  "meter",
]);

export default function NotificationCenter({
  revision = 0,
}: {
  revision?: number;
}) {
  const { tr, language } = useLanguage();
  const { data, error, loading, refresh } = useData(platform.alerts, [
    revision,
  ]);
  const [expanded, setExpanded] = useState(false);
  const rows = (data?.items || []).filter((item: { type: string }) =>
    actionableTypes.has(item.type),
  );
  const visibleRows = expanded ? rows : rows.slice(0, 3);

  return (
    <section className="space-y-4" aria-labelledby="alerts-title">
      <div className="flex items-center gap-3">
        <h2
          id="alerts-title"
          className="flex items-center gap-2 text-xl font-black"
        >
          <Bell size={20} aria-hidden="true" />
          {tr("Needs your attention")}
        </h2>
        {!loading && !error && rows.length > 0 && (
          <span className="dashboard-badge rounded-full px-2.5 py-1 text-xs font-bold">
            {new Intl.NumberFormat(language).format(rows.length)}
          </span>
        )}
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="space-y-3">
          <Notice message={error} error />
          <button type="button" className="btn" onClick={refresh}>
            {tr("Retry")}
          </button>
        </div>
      ) : (
        data && (
          <div className="panel overflow-hidden">
            {rows.length === 0 ? (
              <p className="muted p-6 text-center text-sm">
                {tr(
                  "Nothing needs your attention based on your current records.",
                )}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--wameed-border)]">
                {visibleRows.map((alert: any, index: number) => (
                  <li
                    key={`${alert.type}-${alert.href}-${alert.date}-${index}`}
                  >
                    <Link
                      to={alert.href}
                      className="flex items-center justify-between gap-4 p-4 transition hover:bg-emerald-500/5 sm:p-5"
                    >
                      <div className="min-w-0">
                        <h3
                          className={`text-sm font-bold ${alert.type === "overdue" ? "text-red-600 dark:text-red-400" : ""}`}
                        >
                          {tr(alert.title)}
                        </h3>
                        <p className="muted mt-1 break-words text-xs leading-6">
                          {tr(alert.description)}
                        </p>
                        {(alert.amount != null || alert.date) && (
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                            {alert.amount != null && (
                              <strong>{money(alert.amount)}</strong>
                            )}
                            {alert.date && (
                              <time dateTime={alert.date} className="muted">
                                {day(alert.date)}
                              </time>
                            )}
                          </div>
                        )}
                      </div>
                      <ArrowRight
                        size={17}
                        className="shrink-0 muted"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {rows.length > 3 && (
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
                className="dashboard-link min-h-11 w-full border-t border-[var(--wameed-border)] p-3 text-sm font-bold"
              >
                {expanded
                  ? tr("Show less")
                  : `${tr("Show all alerts")} (${new Intl.NumberFormat(language).format(rows.length)})`}
              </button>
            )}
          </div>
        )
      )}
    </section>
  );
}
