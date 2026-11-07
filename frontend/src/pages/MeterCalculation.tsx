import QuietSection from "../components/platform/QuietSection";
import AddButton from "../components/platform/AddButton";
import { Gauge as PageTitleIcon } from "lucide-react";
import { numberLocale } from "../i18n/runtime";
import { useLanguage as useUiLanguage } from "../contexts/LanguageContext";
import { tr, direction } from "../i18n/runtime";
import { useSearchParams } from "react-router-dom";
import { usePermissions } from "../contexts/PermissionsContext";
import { FormEvent, useEffect, useState } from "react";
import {
  RefreshCw,
  Zap,
  Droplets,
  Flame,
  Gauge,
  History,
  CheckCircle2,
} from "lucide-react";
import {
  PageHead,
  Modal,
  Loading,
  Notice,
  Empty,
  money,
  day,
  errorText,
} from "../components/platform/UI";
import {
  MeterRecord,
  PropertyRecord,
  ReadingRecord,
  realEstateService,
} from "../services/realEstateService";
const typeLabels: Record<string, string> = {
  electricity: "Electricity",
  water: "Water",
  gas: "Gas",
};
const number = (n: number) =>
  new Intl.NumberFormat(numberLocale(), { maximumFractionDigits: 2 }).format(n);
export default function MeterCalculation() {
  useUiLanguage();
  const [params, setParams] = useSearchParams();
  const { can } = usePermissions();
  const [meters, setMeters] = useState<MeterRecord[]>([]);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [newMeter, setNewMeter] = useState({
    property_id: "",
    meter_type: "electricity",
    meter_number: "",
  });
  const [meterId, setMeterId] = useState("");
  const [current, setCurrent] = useState("");
  const [notes, setNotes] = useState("");
  const [readings, setReadings] = useState<ReadingRecord[]>([]);
  const [result, setResult] = useState<ReadingRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingMeter, setCreatingMeter] = useState(false);
  const [showAddMeter, setShowAddMeter] = useState(false);
  const [meterError, setMeterError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    setBusy(true);
    setError("");
    Promise.all([
      realEstateService.getMeters(),
      realEstateService.getProperties(),
    ])
      .then(([items, propertyItems]) => {
        if (!live) return;
        setMeters(items);
        setProperties(propertyItems);
        if (items.length)
          setMeterId(
            items.some((m) => String(m.id) === params.get("meter"))
              ? params.get("meter")!
              : String(items[0].id),
          );
        if (propertyItems.length)
          setNewMeter((v) => ({
            ...v,
            property_id: String(propertyItems[0].id),
          }));
      })
      .catch((e) => {
        if (live) setError(errorText(e));
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [revision]);
  useEffect(() => {
    if (!meterId) {
      setReadings([]);
      return;
    }
    setResult(null);
    setCurrent("");
    setNotes("");
    setReadings([]);
    setHistoryError("");
    setHistoryBusy(true);
    let live = true;
    realEstateService
      .getMeterReadings(Number(meterId))
      .then((r) => {
        if (live) setReadings(r);
      })
      .catch((e) => {
        if (live) setHistoryError(errorText(e));
      })
      .finally(() => {
        if (live) setHistoryBusy(false);
      });
    return () => {
      live = false;
    };
  }, [meterId, revision]);
  useEffect(() => {
    const requested = params.get("meter");
    if (requested && meters.some((item) => String(item.id) === requested))
      setMeterId(requested);
  }, [params, meters]);
  const meter = meters.find((item) => item.id === Number(meterId));
  async function addMeter(e: FormEvent) {
    e.preventDefault();
    setMeterError("");
    if (!newMeter.meter_number.trim()) {
      setMeterError("Enter a meter number.");
      return;
    }
    setCreatingMeter(true);
    try {
      const created = await realEstateService.createMeter({
        property_id: Number(newMeter.property_id),
        meter_type: newMeter.meter_type as "electricity" | "water" | "gas",
        meter_number: newMeter.meter_number.trim(),
      });
      setMeters((items) => [...items, created]);
      setMeterId(String(created.id));
      setParams({ meter: String(created.id) });
      setNewMeter((v) => ({ ...v, meter_number: "" }));
      setShowAddMeter(false);
    } catch (e: any) {
      setMeterError(errorText(e));
    } finally {
      setCreatingMeter(false);
    }
  }
  async function calculate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!meter) {
      setError(tr("Select a registered meter first."));
      return;
    }
    const value = Number(current);
    if (
      !current.trim() ||
      !Number.isFinite(value) ||
      value < meter.current_reading
    ) {
      setError(
        "" +
          tr("The current reading must be ") +
          meter.current_reading +
          tr(" or higher."),
      );
      return;
    }
    setSaving(true);
    try {
      const saved = await realEstateService.calculateMeter(
        meter.id,
        value,
        notes,
      );
      setResult(saved);
      setCurrent("");
      setNotes("");
      setMeters((items) =>
        items.map((item) =>
          item.id === meter.id
            ? {
                ...item,
                previous_reading: saved.previous_reading,
                current_reading: saved.current_reading,
              }
            : item,
        ),
      );
      setReadings((items) => [saved, ...items]);
    } catch (e: any) {
      setError(e?.response?.data?.detail || tr("Unable to save the reading."));
    } finally {
      setSaving(false);
    }
  }
  const latest = readings[0];
  const consumption =
    current.trim() &&
    meter &&
    Number.isFinite(Number(current)) &&
    Number(current) >= meter.current_reading
      ? Number(current) - meter.current_reading
      : null;
  const MeterIcon =
    meter?.meter_type === "water"
      ? Droplets
      : meter?.meter_type === "gas"
        ? Flame
        : Zap;
  return (
    <section
      dir={direction()}
      className="quiet-workspace mx-auto max-w-7xl space-y-6"
    >
      <PageHead
        icon={PageTitleIcon}
        title={tr("Meter readings & bills")}
        description={tr(
          "Select a meter, record its reading and review your saved bills.",
        )}
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => setRevision((v) => v + 1)}
            disabled={busy || saving || creatingMeter}
            aria-label={tr("Refresh data")}
            title={tr("Refresh data")}
          >
            <RefreshCw size={17} className={busy ? "animate-spin" : ""} />
          </button>
          {can("meters", "create") && (
            <AddButton
              type="button"

              disabled={busy || saving}
              onClick={() => {
                setMeterError("");
                setShowAddMeter(true);
              }}
            >
              {tr("Add meter")}
            </AddButton>
          )}
        </div>
      </PageHead>
      {error && <Notice message={error} error />}
      {busy ? (
        <Loading />
      ) : meters.length === 0 ? (
        <Empty>
          {tr(
            "No meters registered. Register your property's actual meter to start saving readings.",
          )}
        </Empty>
      ) : (
        <>
          <section
            className="panel flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6"
            aria-label={tr("Selected meter")}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="dashboard-icon rounded-2xl p-3">
                <MeterIcon size={24} />
              </span>
              <div className="min-w-0">
                <p className="muted text-xs">{tr("Selected meter")}</p>
                <h2 className="mt-1 break-words text-lg font-black">
                  {meter?.meter_number}
                </h2>
                <p className="muted mt-1 text-sm">
                  {tr(typeLabels[meter?.meter_type || ""] || "Meter")} ·{" "}
                  {meter?.property?.name ||
                    properties.find((p) => p.id === meter?.property_id)?.name ||
                    tr("Property")}
                </p>
              </div>
            </div>
            <label className="w-full text-sm font-bold sm:w-80">
              {tr("Switch meter")}
              <select
                className="field"
                value={meterId}
                disabled={saving}
                onChange={(e) => {
                  setMeterId(e.target.value);
                  setParams({ meter: e.target.value });
                  setError("");
                }}
              >
                {meters.map((m) => (
                  <option value={m.id} key={m.id}>
                    {m.meter_number} ·{" "}
                    {tr(typeLabels[m.meter_type] || m.meter_type)} ·{" "}
                    {m.property?.name ||
                      properties.find((p) => p.id === m.property_id)?.name ||
                      m.property_id}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <QuietSection title={tr("Meter summary")}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Previous recorded reading:",
                  value: meter ? number(meter.current_reading) : "—",
                },
                {
                  label: "Latest saved bill",
                  value: historyBusy
                    ? "…"
                    : latest
                      ? money(latest.total_cost)
                      : "—",
                },
                {
                  label: "Last reading date",
                  value: historyBusy
                    ? "…"
                    : latest
                      ? day(latest.reading_date)
                      : "—",
                },
              ].map((item, index) => (
                <article
                  className={`panel p-4 sm:p-5 ${index === 0 ? "col-span-2 sm:col-span-1" : ""}`}
                  key={item.label}
                >
                  <p className="muted text-xs font-medium">{tr(item.label)}</p>
                  <p className="mt-2 break-words text-xl font-black tabular-nums">
                    {item.value}
                  </p>
                </article>
              ))}
            </div>
          </QuietSection>
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
            <section className="panel overflow-hidden">
              <div className="flex items-center gap-3 border-b border-[var(--wameed-border)] p-5">
                <Gauge size={20} className="dashboard-link" />
                <h2 className="font-black">{tr("New reading")}</h2>
              </div>
              <form onSubmit={calculate} className="space-y-5 p-5 sm:p-6">
                <label className="block text-sm font-bold">
                  {tr("Current reading")}
                  <input
                    className="field tabular-nums"
                    type="number"
                    inputMode="decimal"
                    lang="en"
                    min={meter?.current_reading ?? 0}
                    step="any"
                    required
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    disabled={saving || !can("meters", "create")}
                    aria-describedby="reading-hint"
                  />
                </label>
                <p id="reading-hint" className="muted !mt-2 text-xs leading-6">
                  {tr(
                    "Enter the value shown on the meter. It must not be lower than the previous reading.",
                  )}
                </p>
                <div
                  className="dashboard-icon flex items-center justify-between gap-3 rounded-xl p-4"
                  aria-live="polite"
                >
                  <span className="text-sm font-semibold">
                    {tr("Consumption")}
                  </span>
                  <strong className="text-xl tabular-nums">
                    {consumption === null ? "—" : number(consumption)}
                  </strong>
                </div>
                <label className="block text-sm font-bold">
                  {tr("Notes (optional)")}
                  <textarea
                    className="field resize-y"
                    rows={3}
                    maxLength={3000}
                    value={notes}
                    disabled={saving || !can("meters", "create")}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                <p className="muted text-xs leading-6">
                  {tr(
                    "The final amount and VAT are calculated when the reading is saved.",
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary flex-1"
                    disabled={
                      saving ||
                      historyBusy ||
                      consumption === null ||
                      !can("meters", "create")
                    }
                  >
                    {saving ? tr("Saving…") : tr("Calculate and save")}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={saving}
                    onClick={() => {
                      setCurrent("");
                      setNotes("");
                      setResult(null);
                      setError("");
                    }}
                  >
                    {tr("Clear fields")}
                  </button>
                </div>
                {!can("meters", "create") && (
                  <p className="muted text-xs">
                    {tr("Your role can view readings but cannot add them.")}
                  </p>
                )}
              </form>
            </section>
            <div className="min-w-0 space-y-4">
              {result && (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
                >
                  <p className="mb-4 flex items-center gap-2 text-sm font-bold dashboard-link">
                    <CheckCircle2 size={18} />
                    {tr("Reading saved successfully")}
                  </p>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    {[
                      ["Consumption", number(result.units_consumed)],
                      ["Total", money(result.total_cost)],
                      ["Before VAT", money(result.cost_before_tax)],
                      ["VAT", money(result.tax_amount)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="muted text-xs">{tr(label)}</dt>
                        <dd className="mt-1 font-bold">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              <QuietSection
                title={tr("Saved readings and bills")}
                className="min-w-0"
              >
                <div className="flex items-center justify-between gap-3 border-b border-[var(--wameed-border)] p-5">
                  <h2 className="flex items-center gap-3 font-black">
                    <History size={20} className="dashboard-link" />
                    {tr("Reading history")}
                  </h2>
                  <span className="muted text-xs">
                    {historyBusy ? "…" : number(readings.length)}
                  </span>
                </div>
                {historyBusy ? (
                  <div className="p-4">
                    <Loading />
                  </div>
                ) : historyError ? (
                  <div className="p-4">
                    <Notice message={historyError} error />
                    <button
                      type="button"
                      className="btn mt-3"
                      onClick={() => setRevision((v) => v + 1)}
                    >
                      {tr("Retry")}
                    </button>
                  </div>
                ) : readings.length === 0 ? (
                  <div className="empty-state">
                    <History size={30} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">
                      {tr("No saved readings for this meter.")}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto p-3 sm:p-0">
                    <table className="w-full text-start text-sm">
                      <thead className="bg-[var(--wameed-bg)]">
                        <tr>
                          {[
                            "Date",
                            "Previous",
                            "Current",
                            "Consumption",
                            "Total",
                          ].map((label) => (
                            <th
                              key={label}
                              className="p-4 text-start text-xs font-semibold muted"
                            >
                              {tr(label)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {readings.map((r) => (
                          <tr
                            key={r.id}
                            className="border-t border-[var(--wameed-border)]"
                          >
                            <td data-label={tr("Date")} className="p-4">
                              {day(r.reading_date)}
                            </td>
                            <td
                              data-label={tr("Previous")}
                              className="p-4 tabular-nums"
                            >
                              {number(r.previous_reading)}
                            </td>
                            <td
                              data-label={tr("Current")}
                              className="p-4 tabular-nums"
                            >
                              {number(r.current_reading)}
                            </td>
                            <td
                              data-label={tr("Consumption")}
                              className="p-4 tabular-nums"
                            >
                              {number(r.units_consumed)}
                            </td>
                            <td
                              data-label={tr("Total")}
                              className="p-4 font-bold tabular-nums"
                            >
                              {money(r.total_cost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </QuietSection>
            </div>
          </div>
        </>
      )}
      {showAddMeter && (
        <Modal
          title={tr("Add meter")}
          onClose={() => {
            if (!creatingMeter) setShowAddMeter(false);
          }}
        >
          <form onSubmit={addMeter} className="space-y-5">
            <p className="muted text-sm leading-7">
              {tr(
                "Link the meter to a property to keep its readings and bills together.",
              )}
            </p>
            {meterError && <Notice message={meterError} error />}
            <label className="block text-sm font-bold">
              {tr("Property")}
              <select
                required
                className="field"
                value={newMeter.property_id}
                disabled={creatingMeter}
                onChange={(e) =>
                  setNewMeter({ ...newMeter, property_id: e.target.value })
                }
              >
                <option value="">{tr("Select property")}</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold">
                {tr("Meter type")}
                <select
                  className="field"
                  value={newMeter.meter_type}
                  disabled={creatingMeter}
                  onChange={(e) =>
                    setNewMeter({ ...newMeter, meter_type: e.target.value })
                  }
                >
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {tr(label)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold">
                {tr("Meter number")}
                <input
                  className="field"
                  required
                  maxLength={50}
                  disabled={creatingMeter}
                  value={newMeter.meter_number}
                  onChange={(e) =>
                    setNewMeter({ ...newMeter, meter_number: e.target.value })
                  }
                />
              </label>
            </div>
            {properties.length === 0 && (
              <p className="muted text-sm">
                {tr(
                  "Add a property first. Every meter must be linked to an existing property.",
                )}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn"
                disabled={creatingMeter}
                onClick={() => setShowAddMeter(false)}
              >
                {tr("Cancel")}
              </button>
              <button
                className="btn btn-primary"
                disabled={creatingMeter || properties.length === 0}
              >
                {creatingMeter ? tr("Registering…") : tr("Register meter")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
