import { numberLocale } from "../../i18n/runtime";
import { useLanguage as useUiLanguage } from "../../contexts/LanguageContext";
import { tr } from "../../i18n/runtime";
import { useState } from "react";
import { platform, initialRange } from "../../services/platform";
import RangeFilters from "./RangeFilters";
import { useData, Loading, Notice, money, day } from "./UI";
const metrics = [
  {
    key: "revenue",
    get label() {
      return tr("Contractual revenue");
    },
    color: "#15966D",
  },
  {
    key: "collections",
    get label() {
      return tr("Collections");
    },
    color: "#3987CF",
  },
  {
    key: "expenses",
    get label() {
      return tr("Expenses");
    },
    color: "#D56F4B",
  },
  {
    key: "net_income",
    get label() {
      return tr("Net income");
    },
    color: "#B08B28",
  },
  {
    key: "cash_net",
    get label() {
      return tr("Net cash");
    },
    color: "#9974CB",
  },
];
export default function Analytics({ revision = 0 }: { revision?: number }) {
  useUiLanguage();
  const [range, setRange] = useState(initialRange),
    [selected, setSelected] = useState<string[]>(metrics.map((x) => x.key)),
    [active, setActive] = useState<number | null>(null),
    [table, setTable] = useState(false);
  const { data, error, loading, refresh } = useData(
    () => platform.analytics(range),
    [JSON.stringify(range), revision],
  );
  const rows: any[] = data?.months || [];
  const values = rows.flatMap((r) => selected.map((k) => Number(r[k]))),
    low = Math.min(0, ...values),
    high = Math.max(1, ...values);
  const x = (i: number) => 60 + (i / Math.max(1, rows.length - 1)) * 810;
  const y = (v: number) => 230 - ((v - low) / (high - low)) * 195;
  return (
    <section className="space-y-4" aria-labelledby="analytics-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="analytics-title" className="text-xl font-black">
          {" "}
          {tr("Financial analytics")}{" "}
        </h2>
        <button className="btn" onClick={() => setTable(!table)}>
          {table ? tr("Show chart") : tr("Show data table")}
        </button>
      </div>
      <RangeFilters
        value={range}
        onChange={(r) => {
          setRange(r);
          setActive(null);
        }}
      />
      {error && (
        <>
          <Notice message={error} error />
          <button className="btn" onClick={refresh}>
            {" "}
            {tr("Retry")}{" "}
          </button>
        </>
      )}
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {metrics.map((m) => {
                const value = data.totals[m.key],
                  previous = data.previous[m.key];
                const delta =
                  previous === 0
                    ? null
                    : Math.round(
                        ((value - previous) / Math.abs(previous)) * 100,
                      );
                return (
                  <article className="panel p-4" key={m.key}>
                    <h3 className="muted text-xs font-bold">{m.label}</h3>
                    <p className="my-3 break-words text-lg font-black">
                      {money(value)}
                    </p>
                    <p className="muted text-[11px]">
                      {delta === null
                        ? tr("No previous value to compare")
                        : "" +
                          (delta > 0 ? "+" : "") +
                          delta +
                          tr("% versus the previous period")}
                    </p>
                  </article>
                );
              })}
            </div>
            <div className="panel p-4 sm:p-6">
              <div className="mb-5 flex flex-wrap gap-2">
                {metrics.map((m) => (
                  <button
                    key={m.key}
                    aria-pressed={selected.includes(m.key)}
                    className={`btn text-xs ${selected.includes(m.key) ? "" : "opacity-50"}`}
                    onClick={() =>
                      setSelected((old) =>
                        old.includes(m.key)
                          ? old.filter((k) => k !== m.key)
                          : [...old, m.key],
                      )
                    }
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: m.color }}
                    />
                    {m.label}
                  </button>
                ))}
              </div>
              {rows.length === 0 ? (
                <p className="muted py-8 text-center">
                  {" "}
                  {tr("No data for the selected period.")}{" "}
                </p>
              ) : table ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-sm">
                    <thead>
                      <tr>
                        {[tr("Month"), ...metrics.map((m) => m.label)].map(
                          (x) => (
                            <th className="p-3" key={x}>
                              {x}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.month} className="border-t">
                          <td className="p-3">{r.month}</td>
                          {metrics.map((m) => (
                            <td className="p-3" key={m.key}>
                              {money(r[m.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <>
                  <svg
                    role="img"
                    aria-label={tr(
                      "Interactive revenue, expense, collections and net income chart. All values are also available in the data table.",
                    )}
                    className="w-full min-h-[200px]"
                    viewBox="0 0 930 290"
                    style={{ direction: "ltr" }}
                  >
                    {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                      <g key={f}>
                        <line
                          x1="60"
                          x2="880"
                          y1={35 + f * 195}
                          y2={35 + f * 195}
                          stroke="currentColor"
                          opacity=".09"
                        />
                        <text
                          x="48"
                          y={40 + f * 195}
                          textAnchor="end"
                          fontSize="10"
                          fill="currentColor"
                          opacity=".6"
                        >
                          {Math.round(high - f * (high - low)).toLocaleString(
                            numberLocale(),
                          )}
                        </text>
                      </g>
                    ))}
                    {metrics
                      .filter((m) => selected.includes(m.key))
                      .map((m) => (
                        <g key={m.key}>
                          <polyline
                            fill="none"
                            stroke={m.color}
                            strokeWidth="3"
                            strokeLinejoin="round"
                            points={rows
                              .map((r, i) => `${x(i)},${y(r[m.key])}`)
                              .join(" ")}
                          />
                          {rows.map((r, i) => (
                            <circle
                              key={i}
                              cx={x(i)}
                              cy={y(r[m.key])}
                              r={active === i ? 5 : 3}
                              fill={m.color}
                            />
                          ))}
                        </g>
                      ))}
                    {rows.map((r, i) => (
                      <g key={r.month}>
                        <text
                          x={x(i)}
                          y="262"
                          fontSize={rows.length > 15 ? 8 : 11}
                          textAnchor="middle"
                          fill="currentColor"
                          opacity=".65"
                        >
                          {rows.length > 18 && i % 3 !== 0 ? "" : r.month}
                        </text>
                        <rect
                          x={x(i) - Math.min(30, 400 / rows.length)}
                          y="28"
                          width={Math.min(60, 800 / rows.length)}
                          height="208"
                          fill="transparent"
                          tabIndex={0}
                          role="button"
                          aria-label={`${r.month}: ${metrics.map((m) => `${m.label} ${money(r[m.key])}`).join(tr(", "))}`}
                          onMouseEnter={() => setActive(i)}
                          onFocus={() => setActive(i)}
                          onClick={() => setActive(i)}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowLeft")
                              setActive(
                                Math.min(rows.length - 1, (active ?? i) + 1),
                              );
                            if (e.key === "ArrowRight")
                              setActive(Math.max(0, (active ?? i) - 1));
                          }}
                        />
                      </g>
                    ))}
                  </svg>
                  <label className="mt-3 block text-xs font-bold sm:hidden">
                    {" "}
                    {tr("Month details")}{" "}
                    <select
                      className="field"
                      value={active ?? ""}
                      onChange={(e) =>
                        setActive(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    >
                      <option value="">{tr("Select month")}</option>
                      {rows.map((r, i) => (
                        <option key={r.month} value={i}>
                          {r.month}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div
                    className="mt-3 min-h-16 rounded-xl bg-emerald-500/5 p-3 text-xs"
                    aria-live="polite"
                  >
                    {active === null ? (
                      <p className="muted">
                        {" "}
                        {tr(
                          "Select or hover over a month to see details. Use the data table to read every value.",
                        )}{" "}
                      </p>
                    ) : (
                      <>
                        <strong>{rows[active]?.month}</strong>
                        <div className="mt-2 flex flex-wrap gap-4">
                          {metrics
                            .filter((m) => selected.includes(m.key))
                            .map((m) => (
                              <span key={m.key}>
                                {m.label}: <b>{money(rows[active]?.[m.key])}</b>
                              </span>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
              <p className="muted mt-5 text-xs leading-7">{tr(data.basis)}</p>
              <p className="muted mt-2 text-xs">
                {" "}
                {tr("Period:")} {day(data.start)} — {day(data.end)}{" "}
                {tr("\u00B7 Previous period:")} {day(data.previous_start)} —{" "}
                {day(data.previous_end)}
              </p>
            </div>
          </>
        )
      )}
    </section>
  );
}
