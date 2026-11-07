import { FilterPanel } from "../components/platform/QuietSection";
import { BarChart3 as PageTitleIcon } from "lucide-react";
import { currentLanguage } from "../i18n/runtime";
import { numberLocale } from "../i18n/runtime";
import { useLanguage as useUiLanguage } from "../contexts/LanguageContext";
import { tr, direction } from "../i18n/runtime";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Printer } from "lucide-react";
import {
  platform,
  Range,
  initialRange,
  rangeQuery,
  base,
  download,
} from "../services/platform";
import api from "../services/api";
import {
  useData,
  PageHead,
  Notice,
  Empty,
  Loading,
  errorText,
  money,
  day,
} from "../components/platform/UI";
import RangeFilters from "../components/platform/RangeFilters";
const reports = [
  ["monthly", "Monthly report"],
  ["annual", "Annual report"],
  ["revenue", "Revenue"],
  ["expenses", "Expenses"],
  ["collections", "Collections"],
  ["overdue", "Overdue rent"],
  ["contracts", "Contracts"],
  ["properties", "Properties & units"],
  ["performance", "Property performance"],
];
export default function ReportCenter() {
  useUiLanguage();
  const [params] = useSearchParams();
  const [kind, setKind] = useState("monthly"),
    [range, setRange] = useState<Range>({
      ...initialRange,
      property_id: params.get("property_id") || "",
    }),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(""),
    [page, setPage] = useState(1),
    [draftStatus, setDraftStatus] = useState(""),
    [draftCategory, setDraftCategory] = useState("");
  const { data, error, loading, refresh } = useData(
    () => platform.report(kind, range),
    [kind, JSON.stringify(range)],
  );
  async function excel() {
    setBusy(true);
    setFailure("");
    try {
      const blob = await api.get<Blob>(
        `${base}/reports/export.xlsx?kind=${kind}&${rangeQuery(range)}&language=${currentLanguage()}`,
        { responseType: "blob" },
      );
      download(
        blob,
        `WAMEED-${kind}-${data?.start || ""}-${data?.end || ""}.xlsx`,
      );
    } catch (e) {
      setFailure(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  function print() {
    if (!data) return;
    window.print();
  }
  return (
    <section
      className="quiet-workspace report-center mx-auto max-w-7xl space-y-5"
      dir={direction()}
    >
      <PageHead
        icon={PageTitleIcon}
        title={tr("Report center")}
        description={tr(
          "Reports from your actual records, filtered by period and property, ready to export and print.",
        )}
      >
        <details className="quiet-export no-print">
          <summary className="btn cursor-pointer">
            {tr("Export / print")}
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={busy || loading || !data}
              className="btn"
              onClick={() => void excel()}
            >
              <Download size={16} />
              {busy ? tr("Exporting\u2026") : tr("Export Excel")}
            </button>
            <button
              disabled={loading || !data}
              className="btn btn-primary"
              onClick={print}
            >
              <Printer size={16} />
              {tr("PDF / Print")}{" "}
            </button>
          </div>
        </details>
      </PageHead>
      <label className="panel no-print block space-y-2 p-4 text-sm font-bold">
        <span>{tr("Report type")}</span>
        <select
          className="field"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setPage(1);
            setDraftStatus("");
            setDraftCategory("");
            setRange((r) => ({ ...r, status: "", category: "" }));
          }}
        >
          {reports.map(([key, title]) => (
            <option key={key} value={key}>
              {tr(title)}
            </option>
          ))}
        </select>
      </label>
      <FilterPanel title="Period & property">
        <RangeFilters
          value={range}
          onChange={(r) => {
            setRange({ ...r, status: draftStatus, category: draftCategory });
            setPage(1);
          }}
          extra={
            kind === "contracts" ? (
              <label className="text-xs font-bold">
                {" "}
                {tr("Contract status")}{" "}
                <select
                  className="field"
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value)}
                >
                  <option value="">{tr("All statuses")}</option>
                  <option value="active">{tr("Active")}</option>
                  <option value="upcoming">{tr("Upcoming")}</option>
                  <option value="expired">{tr("Expired")}</option>
                  <option value="cancelled">{tr("Cancelled")}</option>
                  <option value="inactive">{tr("Inactive")}</option>
                </select>
              </label>
            ) : kind === "expenses" ? (
              <label className="text-xs font-bold">
                {" "}
                {tr("Expense category")}{" "}
                <input
                  className="field"
                  placeholder={tr("All categories")}
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value)}
                />
              </label>
            ) : null
          }
        />
      </FilterPanel>
      <Notice message={error || failure} error />
      {error && (
        <button className="btn" onClick={refresh}>
          {" "}
          {tr("Retry")}{" "}
        </button>
      )}
      {loading ? (
        <Loading />
      ) : (
        data && (
          <article className="panel report-paper p-5 sm:p-7">
            <header className="mb-6 border-b pb-5">
              <p className="text-xs font-black tracking-widest text-emerald-700">
                {" "}
                {tr("WAMEED \u00B7 \u0648\u064E\u0645\u0650\u064A\u0636")}{" "}
              </p>
              <h2 className="mt-2 text-xl font-black">{tr(data.title)}</h2>
              <p className="mt-2 text-sm font-bold">
                {range.property_id ? data.property_name : tr("All properties")}
              </p>
              <p className="muted mt-2 text-sm">
                {" "}
                {tr("From")} {day(data.start)} {tr("To")} {day(data.end)} ·{" "}
                {data.count} {tr("records")}{" "}
              </p>
              {data.total != null && (
                <p className="mt-3 text-lg font-bold">
                  {" "}
                  {tr("Total:")} {money(data.total)}
                </p>
              )}
            </header>
            {data.rows.length === 0 ? (
              <Empty>{tr("No records match the selected filters.")}</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <thead>
                    <tr>
                      {data.columns.map((c: any) => (
                        <th key={c.key} className="p-3">
                          {tr(c.label)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row: any, i: number) => (
                      <tr
                        className={`border-t ${i < (page - 1) * 30 || i >= page * 30 ? "print-only-row" : ""}`}
                        key={i}
                      >
                        {data.columns.map((c: any) => (
                          <td className="p-3" key={c.key}>
                            {typeof row[c.key] === "number"
                              ? row[c.key].toLocaleString(numberLocale(), {
                                  maximumFractionDigits: 2,
                                })
                              : (
                                  {
                                    get active() {
                                      return tr("Active");
                                    },
                                    get upcoming() {
                                      return tr("Upcoming");
                                    },
                                    get expired() {
                                      return tr("Expired");
                                    },
                                    get inactive() {
                                      return tr("Inactive");
                                    },
                                    get cancelled() {
                                      return tr("Cancelled");
                                    },
                                  } as Record<string, string>
                                )[row[c.key]] ||
                                row[c.key] ||
                                "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.rows.length > 30 && (
              <div className="no-print mt-5 flex items-center justify-center gap-3">
                <button
                  disabled={page === 1}
                  className="btn"
                  onClick={() => setPage(page - 1)}
                >
                  {" "}
                  {tr("Previous")}{" "}
                </button>
                <span className="text-sm">
                  {page} / {Math.ceil(data.rows.length / 30)}
                </span>
                <button
                  disabled={page * 30 >= data.rows.length}
                  className="btn"
                  onClick={() => setPage(page + 1)}
                >
                  {" "}
                  {tr("Next")}{" "}
                </button>
              </div>
            )}
            <footer className="mt-6 border-t pt-4 text-xs leading-7 muted">
              <p>{tr(data.basis)}</p>
              <p>{tr("Everything Under Control.")}</p>
              <p className="no-print mt-2">
                {" "}
                {tr(
                  "PDF / Print opens print preview. Choose Save as PDF for a formatted copy of all pages.",
                )}{" "}
              </p>
            </footer>
          </article>
        )
      )}
    </section>
  );
}
