import LocalizedInput from "./LocalizedInput";
import { useLanguage as useUiLanguage } from "../../contexts/LanguageContext";
import { tr } from "../../i18n/runtime";
import { FormEvent, useEffect, useState } from "react";
import { initialRange, Range } from "../../services/platform";
import {
  realEstateService,
  PropertyRecord,
} from "../../services/realEstateService";
export default function RangeFilters({
  value,
  onChange,
  extra,
}: {
  value: Range;
  onChange: (r: Range) => void;
  extra?: React.ReactNode;
}) {
  useUiLanguage();
  const [draft, setDraft] = useState(value),
    [properties, setProperties] = useState<PropertyRecord[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    realEstateService
      .getHistoricalProperties()
      .then(setProperties)
      .catch(() => {});
  }, []);
  useEffect(() => setDraft(value), [value]);
  function apply(e: FormEvent) {
    e.preventDefault();
    if (
      draft.preset === "custom" &&
      (!draft.start || !draft.end || draft.start > draft.end)
    ) {
      setError(tr("Select a valid start and end date."));
      return;
    }
    setError("");
    onChange(draft);
  }
  return (
    <form onSubmit={apply} className="panel no-print space-y-3 p-4">
      <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs font-bold">
          {" "}
          {tr("Period")}{" "}
          <select
            className="field"
            value={draft.preset}
            onChange={(e) => setDraft({ ...draft, preset: e.target.value })}
          >
            <option value="6">{tr("Last 6 months")}</option>
            <option value="12">{tr("Last 12 months")}</option>
            <option value="year">{tr("This year")}</option>
            <option value="custom">{tr("Custom period")}</option>
          </select>
        </label>
        <label className="text-xs font-bold">
          {" "}
          {tr("Property")}{" "}
          <select
            className="field"
            value={draft.property_id}
            onChange={(e) =>
              setDraft({ ...draft, property_id: e.target.value })
            }
          >
            <option value="">{tr("All properties")}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {draft.preset === "custom" && (
          <>
            <label className="text-xs font-bold">
              {" "}
              {tr("From")}{" "}
              <LocalizedInput
                className="field"
                type="date"
                required
                value={draft.start}
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
              />
            </label>
            <label className="text-xs font-bold">
              {" "}
              {tr("To")}{" "}
              <LocalizedInput
                className="field"
                type="date"
                required
                min={draft.start}
                value={draft.end}
                onChange={(e) => setDraft({ ...draft, end: e.target.value })}
              />
            </label>
          </>
        )}
        {extra}
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1">{tr("Apply")}</button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setDraft(initialRange);
              onChange(initialRange);
              setError("");
            }}
          >
            {" "}
            {tr("Clear")}{" "}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {tr(error)}
        </p>
      )}
    </form>
  );
}
