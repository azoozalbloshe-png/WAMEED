import { numberLocale } from "../i18n/runtime";
import { useLanguage as useUiLanguage } from "../contexts/LanguageContext";
import { tr, direction } from "../i18n/runtime";
import { useSearchParams } from "react-router-dom";
import { usePermissions } from "../contexts/PermissionsContext";
import { FormEvent, useEffect, useState } from "react";
import { Calculator, RefreshCcw, Zap, Droplets } from "lucide-react";
import {
  MeterRecord,
  PropertyRecord,
  ReadingRecord,
  realEstateService,
} from "../services/realEstateService";
const money = (n: number) =>
  "" +
  Number(n || 0).toLocaleString(numberLocale(), { maximumFractionDigits: 2 }) +
  tr(" SAR");
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
  useEffect(() => {
    Promise.all([
      realEstateService.getMeters(),
      realEstateService.getProperties(),
    ])
      .then(([items, propertyItems]) => {
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
      .catch((e) =>
        setError(e?.response?.data?.detail || tr("Unable to load your data.")),
      )
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => {
    if (!meterId) {
      setReadings([]);
      return;
    }
    setResult(null);
    setReadings([]);
    let live = true;
    realEstateService
      .getMeterReadings(Number(meterId))
      .then((r) => {
        if (live) setReadings(r);
      })
      .catch((e) =>
        setError(
          e?.response?.data?.detail || tr("Unable to load meter readings."),
        ),
      );
    return () => {
      live = false;
    };
  }, [meterId]);
  useEffect(() => {
    const requested = params.get("meter");
    if (requested && meters.some((item) => String(item.id) === requested))
      setMeterId(requested);
  }, [params, meters]);
  const meter = meters.find((item) => item.id === Number(meterId));
  async function addMeter(e: FormEvent) {
    e.preventDefault();
    setError("");
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
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || tr("Unable to register the meter."),
      );
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
    if (!Number.isFinite(value) || value < meter.current_reading) {
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
  return (
    <section dir={direction()} className="mx-auto max-w-6xl space-y-6 pb-10">
      <header className="flex items-center gap-4 rounded-3xl bg-[#103B35] p-6 text-white sm:p-8">
        <span className="rounded-2xl bg-[#DDB13B] p-3 text-[#103B35]">
          <Calculator />
        </span>
        <div>
          <h1 className="text-2xl font-black">
            {tr("Meter readings & bills")}
          </h1>
          <p className="mt-1 text-sm text-white/70">
            {" "}
            {tr(
              "Calculations and saved readings use the registered meter's settings.",
            )}{" "}
          </p>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {tr(error)}
        </p>
      )}
      {busy ? (
        <p>{tr("Loading meters\u2026")}</p>
      ) : (
        <>
          {meters.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-white p-6 text-center text-gray-600">
              {" "}
              {tr(
                "No meters registered. Register your property's actual meter to start saving readings.",
              )}{" "}
            </div>
          )}
          {can("meters", "create") && (
            <form
              onSubmit={addMeter}
              className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
            >
              <h2 className="font-black sm:col-span-2 lg:col-span-4">
                {" "}
                {tr("Register an existing meter")}{" "}
              </h2>
              <label className="text-sm font-bold">
                {" "}
                {tr("Property")}{" "}
                <select
                  required
                  value={newMeter.property_id}
                  onChange={(e) =>
                    setNewMeter({ ...newMeter, property_id: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border p-3"
                >
                  <option value="">{tr("Select property")}</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                {" "}
                {tr("Meter type")}{" "}
                <select
                  value={newMeter.meter_type}
                  onChange={(e) =>
                    setNewMeter({ ...newMeter, meter_type: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border p-3"
                >
                  <option value="electricity">{tr("Electricity")}</option>
                  <option value="water">{tr("Water")}</option>
                  <option value="gas">{tr("Gas")}</option>
                </select>
              </label>
              <label className="text-sm font-bold">
                {" "}
                {tr("Meter number")}{" "}
                <input
                  required
                  maxLength={50}
                  value={newMeter.meter_number}
                  onChange={(e) =>
                    setNewMeter({ ...newMeter, meter_number: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border p-3"
                />
              </label>
              <button
                disabled={creatingMeter || properties.length === 0}
                className="self-end rounded-xl bg-[#103B35] p-3 font-bold text-white disabled:opacity-50"
              >
                {creatingMeter ? tr("Registering\u2026") : tr("Register meter")}
              </button>
              {properties.length === 0 && (
                <p className="text-xs text-gray-500 sm:col-span-2 lg:col-span-4">
                  {" "}
                  {tr(
                    "Add a property first. Every meter must be linked to an existing property.",
                  )}{" "}
                </p>
              )}
            </form>
          )}
          {meters.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <form
                onSubmit={calculate}
                className="space-y-4 rounded-2xl bg-white p-5 shadow-sm sm:p-7"
              >
                <h2 className="font-black">{tr("New reading")}</h2>
                <label className="block text-sm font-bold">
                  {" "}
                  {tr("Meter")}{" "}
                  <select
                    value={meterId}
                    onChange={(e) => {
                      setMeterId(e.target.value);
                      setParams({ meter: e.target.value });
                      setResult(null);
                    }}
                    className="mt-2 w-full rounded-xl border p-3"
                  >
                    {meters.map((m) => (
                      <option value={m.id} key={m.id}>
                        {m.meter_number} · {tr(({electricity:'Electricity',water:'Water',gas:'Gas'} as Record<string,string>)[m.meter_type]||m.meter_type)} ·{" "}
                        {m.property?.name ||
                          "" + tr("Property ") + m.property_id}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-xl bg-gray-50 p-4 text-sm">
                  {meter?.meter_type === "water" ? (
                    <Droplets className="me-2 inline h-4 w-4 text-sky-700" />
                  ) : (
                    <Zap className="me-2 inline h-4 w-4 text-amber-600" />
                  )}{" "}
                  {tr("Previous recorded reading:")}{" "}
                  <b>{meter?.current_reading ?? "—"}</b>
                </div>
                <label className="block text-sm font-bold">
                  {" "}
                  {tr("Current reading")}{" "}
                  <input
                    type="number"
                    lang="en"
                    min={meter?.current_reading ?? 0}
                    step="any"
                    required
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    className="mt-2 w-full rounded-xl border p-3"
                  />
                </label>
                <label className="block text-sm font-bold">
                  {" "}
                  {tr("Notes (optional)")}{" "}
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2 w-full rounded-xl border p-3"
                  />
                </label>
                <div className="flex gap-3">
                  <button
                    disabled={saving || !can("meters", "create")}
                    className="flex-1 rounded-xl bg-[#103B35] p-3 font-bold text-white disabled:opacity-60"
                  >
                    {saving ? tr("Saving\u2026") : tr("Calculate and save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrent("");
                      setNotes("");
                      setResult(null);
                      setError("");
                    }}
                    className="rounded-xl border p-3"
                    title={tr("Clear fields")}
                  >
                    <RefreshCcw className="h-5 w-5" />
                  </button>
                </div>
              </form>
              <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm sm:p-7">
                <h2 className="font-black">
                  {result ? tr("Saved reading result") : tr("Reading history")}
                </h2>
                {result && (
                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-emerald-50 p-4 text-sm">
                    <p>
                      {" "}
                      {tr("Consumption")}{" "}
                      <b className="block text-lg">{result.units_consumed}</b>
                    </p>
                    <p>
                      {" "}
                      {tr("Total")}{" "}
                      <b className="block text-lg">
                        {money(result.total_cost)}
                      </b>
                    </p>
                    <p>
                      {" "}
                      {tr("Before VAT")}
                      <b>{money(result.cost_before_tax)}</b>
                    </p>
                    <p>
                      {" "}
                      {tr("VAT")}
                      <b>{money(result.tax_amount)}</b>
                    </p>
                  </div>
                )}
                {readings.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
                    {" "}
                    {tr("No saved readings for this meter.")}{" "}
                  </p>
                ) : (
                  <div className="max-h-[28rem] overflow-auto">
                    <table className="w-full min-w-[520px] text-start text-sm">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr>
                          {[
                            tr("Date"),
                            tr("Previous"),
                            tr("Current"),
                            tr("Consumption"),
                            tr("Total"),
                          ].map((h) => (
                            <th className="p-3" key={h}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {readings.map((r) => (
                          <tr key={r.id} className="border-t">
                            <td className="p-3">
                              {new Date(r.reading_date).toLocaleDateString(
                                numberLocale(),
                              )}
                            </td>
                            <td className="p-3">{r.previous_reading}</td>
                            <td className="p-3">{r.current_reading}</td>
                            <td className="p-3">{r.units_consumed}</td>
                            <td className="p-3 font-bold">
                              {money(r.total_cost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
