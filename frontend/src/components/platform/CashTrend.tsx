import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { dateLocale, tr } from "../../i18n/runtime";
import { platform, initialRange } from "../../services/platform";
import { Loading, Notice, money, useData, day } from "./UI";
type Month = { month: string; collections: number; expenses: number };
const monthLabel = (value: string, full = false) =>
  new Intl.DateTimeFormat(dateLocale(), {
    month: full ? "long" : "short",
    ...(full ? { year: "numeric" } : {}),
    timeZone: "Asia/Riyadh",
  }).format(new Date(`${value}-01T12:00:00+03:00`));
export default function CashTrend({ revision }: { revision: number }) {
  useLanguage();
  const { data, error, loading, refresh } = useData(
    () => platform.analytics(initialRange),
    [revision],
  );
  const [selected, setSelected] = useState("");
  const months: Month[] = data?.months || [];
  const active =
    months.find((row) => row.month === selected) || months[months.length - 1];
  const max = Math.max(
    1,
    ...months.flatMap((row) => [row.collections, row.expenses]),
  );
  const empty = months.every(
    (row) => row.collections === 0 && row.expenses === 0,
  );
  return (
    <section
      className="dashboard-panel space-y-3 rounded-2xl border p-4 sm:p-5"
      aria-labelledby="cash-trend-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="cash-trend-title" className="font-black">
            {tr("Cash movement over 6 months")}
          </h2>
          <p className="muted mt-1 text-xs leading-6">
            {tr("Actual recorded collections and expenses through today.")}
            {data ? ` ${day(data.start)} — ${day(data.end)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <i
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-[#15966D]"
            />
            {tr("Collections")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-[#C78A6B]"
            />
            {tr("Expenses")}
          </span>
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="space-y-3">
          <Notice message={tr(error)} error />
          <button className="btn" type="button" onClick={refresh}>
            {tr("Retry")}
          </button>
        </div>
      ) : (
        data && (
          <>
            {empty && (
              <p className="muted text-sm">
                {tr("No recorded cash activity during this period.")}
              </p>
            )}
            {!empty && (
              <div
                className="grid grid-cols-6 gap-1 sm:gap-3"
                dir="ltr"
                role="group"
                aria-label={tr("Monthly collections and expenses")}
              >
                {months.map((row) => (
                  <button
                    key={row.month}
                    type="button"
                    aria-pressed={active?.month === row.month}
                    aria-label={`${monthLabel(row.month, true)}: ${tr("Collections")} ${money(row.collections)}; ${tr("Expenses")} ${money(row.expenses)}`}
                    onClick={() => setSelected(row.month)}
                    className={`min-w-0 rounded-xl px-1 pb-2 pt-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${active?.month === row.month ? "bg-emerald-500/10" : "hover:bg-emerald-500/5"}`}
                  >
                    <span
                      className="flex h-24 items-end justify-center gap-1 border-b border-[var(--wameed-border)] sm:gap-2"
                      aria-hidden="true"
                    >
                      <span
                        className="w-2 rounded-t bg-[#15966D] sm:w-4"
                        style={{
                          height: row.collections
                            ? `${(row.collections / max) * 100}%`
                            : "2px",
                          opacity: row.collections ? 1 : 0.25,
                        }}
                      />
                      <span
                        className="w-2 rounded-t bg-[#C78A6B] sm:w-4"
                        style={{
                          height: row.expenses
                            ? `${(row.expenses / max) * 100}%`
                            : "2px",
                          opacity: row.expenses ? 1 : 0.25,
                        }}
                      />
                    </span>
                    <span className="mt-2 block truncate text-[10px] sm:text-xs">
                      {monthLabel(row.month)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!empty && active && (
              <div
                aria-live="polite"
                className="border-t border-[var(--wameed-border)] pt-3 text-sm"
              >
                <p className="muted mb-1 text-xs">
                  {monthLabel(active.month, true)} ·{" "}
                  {tr("Select a month to view its amounts.")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <p className="min-w-0">
                    <span className="muted block text-xs">
                      {tr("Collections")}
                    </span>
                    <strong className="break-words">
                      {money(active.collections)}
                    </strong>
                  </p>
                  <p className="min-w-0">
                    <span className="muted block text-xs">
                      {tr("Expenses")}
                    </span>
                    <strong className="break-words">
                      {money(active.expenses)}
                    </strong>
                  </p>
                </div>
              </div>
            )}
          </>
        )
      )}
    </section>
  );
}
