import { useEffect, useRef, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Building2, Search, MapPin, SlidersHorizontal, X } from "lucide-react";
import AddButton from "../components/platform/AddButton";
import RecordLifecycleActions from "../components/platform/RecordLifecycleActions";
import {
  Loading,
  PageHead,
  Modal,
  Notice,
  money,
} from "../components/platform/UI";
import { useLanguage } from "../contexts/LanguageContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { tr, direction, numberLocale } from "../i18n/runtime";
import {
  PropertyRecord,
  realEstateService,
} from "../services/realEstateService";
const initial = {
  name: "",
  description: "",
  property_type: "apartment",
  address: "",
  city: "",
  total_units: "0",
  monthly_rent: "0",
};
export default function Properties() {
  useLanguage();
  const { can } = usePermissions();
  const [archived, setArchived] = useState(false),
    [filters, setFilters] = useState(false),
    [city, setCity] = useState("");
  const [items, setItems] = useState<PropertyRecord[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [saveError, setSaveError] = useState("");
  const [form, setForm] = useState(initial),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState("");
  const version = useRef(0);
  async function load() {
    const request = ++version.current;
    setError("");
    try {
      const rows = await (archived
        ? realEstateService.getArchivedProperties()
        : realEstateService.getProperties());
      if (request === version.current) setItems(rows);
    } catch (e: any) {
      if (request === version.current)
        setError(e?.response?.data?.detail || tr("Unable to load properties."));
    } finally {
      if (request === version.current) setLoading(false);
    }
  }
  useEffect(() => {
    setLoading(true);
    void load();
    return () => {
      ++version.current;
    };
  }, [archived]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaveError("");
    try {
      await realEstateService.createProperty({
        ...form,
        total_units: Number(form.total_units),
        monthly_rent: Number(form.monthly_rent),
      });
      setForm(initial);
      setOpen(false);
      setQuery("");
      setCity("");
      if (archived) setArchived(false);
      else await load();
    } catch (e: any) {
      setSaveError(
        e?.response?.data?.detail || tr("Unable to save the property."),
      );
    } finally {
      setBusy(false);
    }
  }
  const cities = Array.from(
    new Set(
      items.map((p) => p.city).filter((value): value is string => !!value),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const visible = items.filter(
    (p) =>
      (!city || p.city === city) &&
      `${p.name} ${p.city || ""} ${p.address || ""}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  const activeFilters = Number(archived) + Number(!!city);
  function clear() {
    setQuery("");
    setCity("");
    setArchived(false);
  }
  return (
    <div
      dir={direction()}
      className="property-workspace mx-auto max-w-7xl space-y-5"
    >
      <PageHead
        icon={Building2}
        title={tr(archived ? "Archived properties" : "Properties")}
      >
        {can("properties", "create") && (
          <AddButton
            onClick={() => {
              setSaveError("");
              setOpen(true);
            }}
          >
            {tr("Add property")}
          </AddButton>
        )}
      </PageHead>
      <Notice message={tr(error)} error />
      <div className="panel p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{tr("Search properties")}</span>
            <Search
              size={18}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 muted"
              aria-hidden="true"
            />
            <input
              type="search"
              className="field w-full ps-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr("Search by name or location")}
            />
          </label>
          <button
            type="button"
            className="btn shrink-0"
            aria-expanded={filters}
            aria-controls="property-filters"
            onClick={() => setFilters(!filters)}
          >
            <SlidersHorizontal size={17} aria-hidden="true" />
            <span>{tr("Filters")}</span>
            {activeFilters > 0 && (
              <span className="property-filter-count">
                {activeFilters.toLocaleString(numberLocale())}
              </span>
            )}
          </button>
        </div>
        {filters && (
          <div
            id="property-filters"
            className="mt-4 grid gap-3 border-t border-[var(--wameed-border)] pt-4 sm:grid-cols-2"
          >
            <label className="space-y-1 text-sm font-bold">
              <span>{tr("Property records")}</span>
              <select
                className="field w-full"
                value={archived ? "archived" : "active"}
                onChange={(e) => {
                  setCity("");
                  setArchived(e.target.value === "archived");
                }}
              >
                <option value="active">{tr("Active properties")}</option>
                <option value="archived">{tr("Archived properties")}</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-bold">
              <span>{tr("City")}</span>
              <select
                className="field w-full"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">{tr("All cities")}</option>
                {cities.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p role="status" className="muted">
          {loading
            ? tr("Loading…")
            : `${tr("Properties shown")}: ${visible.length.toLocaleString(numberLocale())}`}
        </p>
        {(activeFilters > 0 || query) && (
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-bold"
            onClick={clear}
          >
            <X size={15} />
            {tr("Clear filters")}
          </button>
        )}
      </div>
      {loading ? (
        <Loading />
      ) : !error && visible.length === 0 ? (
        <div className="panel space-y-2 p-8 text-center">
          <Building2 className="mx-auto muted" size={26} />
          <p className="font-bold">
            {tr(
              items.length
                ? "No properties match your search."
                : archived
                  ? "No archived properties."
                  : "No properties registered yet.",
            )}
          </p>
          <p className="text-sm muted">
            {tr(
              items.length
                ? "Try another name or clear the filters."
                : archived
                  ? "Archived records will appear here."
                  : "Add your first property to start organizing its units.",
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((p) => (
            <article
              key={p.id}
              className="panel property-record flex items-center gap-1 pe-2"
            >
              <Link
                to={`/properties/${p.id}`}
                className="property-record-link grid min-w-0 flex-1 gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="property-record-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <Building2 size={20} />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <h2 className="break-words font-black">{p.name}</h2>
                    <p className="muted flex items-start gap-1 text-xs leading-5">
                      <MapPin
                        size={13}
                        className="mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="break-words">
                        {[p.city, p.address].filter(Boolean).join(" · ") ||
                          tr("Location not specified")}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm sm:gap-7">
                  <div>
                    <span className="muted block text-xs">{tr("Units")}</span>
                    <strong className="mt-1 block break-words">
                      {p.total_units.toLocaleString(numberLocale())}
                    </strong>
                  </div>
                  <div>
                    <span className="muted block text-xs">
                      {tr("Monthly rent")}
                    </span>
                    <strong className="mt-1 block break-words">
                      {money(p.monthly_rent || 0)}
                    </strong>
                  </div>
                </div>
                <span className="sr-only">{tr("View property & units")}</span>
              </Link>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <RecordLifecycleActions
                  compact
                  resource="properties"
                  id={p.id}
                  name={p.name}
                  archived={!!p.archived_at}
                  onChanged={() => {
                    void load();
                  }}
                  onDeleted={() => {
                    void load();
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
      {error && !loading && (
        <button
          className="btn"
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          {tr("Retry")}
        </button>
      )}
      {open && (
        <Modal
          title={tr("Add property")}
          onClose={() => {
            if (!busy) setOpen(false);
          }}
          className="property-create-modal"
        >
          <form onSubmit={submit} className="space-y-4">
            <Notice message={tr(saveError)} error />
            <label className="block space-y-1 text-sm font-bold">
              <span>{tr("Property name")}</span>
              <input
                required
                autoFocus
                className="field w-full"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["city", "City"],
                ["address", "Address"],
                ["total_units", "Number of units"],
                ["monthly_rent", "Monthly rent"],
              ].map(([key, label]) => (
                <label key={key} className="space-y-1 text-sm font-bold">
                  <span>{tr(label)}</span>
                  <input
                    className="field w-full"
                    type={
                      ["total_units", "monthly_rent"].includes(key)
                        ? "number"
                        : "text"
                    }
                    min={
                      ["total_units", "monthly_rent"].includes(key)
                        ? 0
                        : undefined
                    }
                    step={
                      key === "monthly_rent"
                        ? "0.01"
                        : key === "total_units"
                          ? "1"
                          : undefined
                    }
                    value={form[key as keyof typeof form]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <label className="block space-y-1 text-sm font-bold">
              <span>{tr("Property type")}</span>
              <select
                className="field w-full"
                value={form.property_type}
                onChange={(e) =>
                  setForm({ ...form, property_type: e.target.value })
                }
              >
                {[
                  ["apartment", "Apartments"],
                  ["villa", "Villa"],
                  ["townhouse", "Townhouse"],
                  ["commercial", "Commercial"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {tr(label)}
                  </option>
                ))}
              </select>
            </label>
            <details className="rounded-xl border border-[var(--wameed-border)] p-3">
              <summary className="cursor-pointer text-sm font-bold">
                {tr("Additional details")}
              </summary>
              <label className="mt-3 block space-y-1 text-sm">
                <span>{tr("Description")}</span>
                <textarea
                  className="field w-full"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
            </details>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary flex-1" disabled={busy}>
                {tr(busy ? "Saving…" : "Save property")}
              </button>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                {tr("Cancel")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
