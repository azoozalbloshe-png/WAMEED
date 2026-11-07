import { useLanguage as useUiLanguage } from "../../contexts/LanguageContext";
import { tr } from "../../i18n/runtime";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Zap, ArrowRight } from "lucide-react";
import { platform } from "../../services/platform";
import { Loading, Notice, useData, money, day } from "./UI";
const counted = (n: number, noun: string) =>
  `${n} ${noun}${n === 1 ? "" : "s"}`;
const labels: Record<string, string> = {
  get all() {
    return tr("All");
  },
  get overdue() {
    return tr("Overdue rent");
  },
  get expiring() {
    return tr("Expiring soon");
  },
  get renewal() {
    return tr("Contract renewal");
  },
  get due() {
    return tr("Upcoming payments");
  },
  get vacant() {
    return tr("Vacant units");
  },
  get meter() {
    return tr("Meter readings");
  },
  get bill() {
    return tr("Meter bills");
  },
  get maintenance() {
    return tr("Maintenance");
  },
};
export default function NotificationCenter({
  revision = 0,
}: {
  revision?: number;
}) {
  const { language } = useUiLanguage();
  const { data, error, loading, refresh } = useData(platform.alerts, [
      revision,
    ]),
    [filter, setFilter] = useState("all"),
    [limit, setLimit] = useState(8);
  const rows = (data?.items || []).filter(
    (i: any) => filter === "all" || i.type === filter,
  );
  return (
    <section className="space-y-4" aria-labelledby="alerts-title">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="alerts-title"
          className="flex items-center gap-2 text-xl font-black"
        >
          <Bell size={21} />
          {tr("Alerts & follow-up")}{" "}
        </h2>
        <button className="btn" onClick={refresh} disabled={loading}>
          {" "}
          {tr("Refresh")}{" "}
        </button>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <Notice message={error} error />
      ) : (
        data && (
          <>
            <article className="dashboard-glimpse rounded-2xl border p-5">
              <h3 className="flex items-center gap-2 font-black">
                <Zap size={20} />
                {tr("Today's Wamdah")}{" "}
              </h3>
              <p className="mt-3 text-sm leading-8">
                {data.items.length === 0
                  ? tr(
                      "Nothing needs your attention based on your current records.",
                    )
                  : language === "ar"
                    ? `لديك ${data.counts.expiring || 0} عقد ينتهي خلال 30 يومًا، و${data.counts.overdue || 0} دفعة إيجارية متأخرة، و${data.counts.due || 0} دفعة مستحقة خلال 7 أيام. اضغط على التنبيه لفتح تفاصيله.`
                    : `You have ${counted(data.counts.expiring || 0, "contract")} expiring within 30 days, ${counted(data.counts.overdue || 0, "overdue rent installment")}, and ${counted(data.counts.due || 0, "payment")} due within 7 days. Open an alert to view its details.`}
              </p>
              <p className="mt-2 text-xs opacity-70">
                {" "}
                {tr("Based on records as of")} {day(data.as_of)}
              </p>
            </article>
            <div
              className="flex flex-wrap gap-2"
              aria-label={tr("Filter alerts")}
            >
              {Object.entries(labels).map(([key, label]) => (
                <button
                  className={`btn text-xs ${key === filter ? "btn-primary" : ""}`}
                  key={key}
                  aria-pressed={key === filter}
                  onClick={() => {
                    setFilter(key);
                    setLimit(8);
                  }}
                >
                  {label}{" "}
                  {key === "all" ? data.items.length : data.counts[key] || 0}
                </button>
              ))}
            </div>
            <div className="panel divide-y">
              {rows.length === 0 ? (
                <p className="muted p-8 text-center text-sm">
                  {" "}
                  {tr("No alerts in this category right now.")}{" "}
                </p>
              ) : (
                rows.slice(0, limit).map((a: any, i: number) => (
                  <Link
                    key={`${a.type}-${a.href}-${a.date}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-emerald-500/5"
                    to={a.href}
                  >
                    <div className="min-w-0">
                      <span
                        className={`mb-2 inline-block rounded-full px-2 py-1 text-[10px] font-bold ${a.type === "overdue" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-700"}`}
                      >
                        {labels[a.type]}
                      </span>
                      <h3 className="text-sm font-bold">{tr(a.title)}</h3>
                      <p className="muted mt-1 break-words text-xs leading-6">
                        {tr(a.description)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {a.amount != null && <strong>{money(a.amount)}</strong>}
                      {a.date && <time>{day(a.date)}</time>}
                      <ArrowRight size={16} />
                    </div>
                  </Link>
                ))
              )}
            </div>
            {rows.length > limit && (
              <button className="btn" onClick={() => setLimit(limit + 20)}>
                {" "}
                {tr("Show more (")} {rows.length - limit})
              </button>
            )}
            <p className="muted text-xs leading-7">{tr(data.basis)}</p>
          </>
        )
      )}
    </section>
  );
}
