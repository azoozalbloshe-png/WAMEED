import QuietSection, { FilterPanel } from "../components/platform/QuietSection";
import {
  businessDateTimeInput,
  businessDateTimeIso,
} from "../utils/businessDate";
import AddButton from "../components/platform/AddButton";
import { Wrench as PageTitleIcon } from "lucide-react";
import LocalizedInput from "../components/platform/LocalizedInput";
import { useLanguage as useUiLanguage } from "../contexts/LanguageContext";
import { tr, direction } from "../i18n/runtime";
import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Wrench, Undo2 } from "lucide-react";
import { platform, base } from "../services/platform";
import {
  realEstateService,
  PropertyRecord,
} from "../services/realEstateService";
import api from "../services/api";
import {
  useData,
  Loading,
  Empty,
  Notice,
  PageHead,
  Modal,
  errorText,
  day,
} from "../components/platform/UI";
import Attachments from "../components/platform/Attachments";
import { usePermissions } from "../contexts/PermissionsContext";
const states: Record<string, string> = {
    get open() {
      return tr("Open");
    },
    get in_progress() {
      return tr("In progress");
    },
    get completed() {
      return tr("Completed");
    },
  },
  priorities: Record<string, string> = {
    get low() {
      return tr("Low");
    },
    get normal() {
      return tr("Normal");
    },
    get urgent() {
      return tr("Urgent");
    },
  };
export default function Maintenance() {
  useUiLanguage();
  const [query, setQuery] = useState("");
  const [params] = useSearchParams();
  const { data, error, loading, refresh } = useData(platform.maintenance);
  const [properties, setProperties] = useState<PropertyRecord[]>([]),
    [units, setUnits] = useState<any[]>([]),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState<number | null>(null),
    [confirm, setConfirm] = useState<any>(null),
    [undo, setUndo] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failure, setFailure] = useState(""),
    [filter, setFilter] = useState(""),
    [property, setProperty] = useState(params.get("property_id") || "");
  const { can } = usePermissions();
  const blank = {
    title: "",
    description: "",
    property_id: params.get("property_id") || "",
    unit_id: params.get("unit_id") || "",
    priority: "normal",
    status: "open",
    due_date: "",
  };
  const [form, setForm] = useState(blank);
  useEffect(() => {
    realEstateService
      .getProperties()
      .then(setProperties)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (form.property_id)
      platform
        .property(form.property_id)
        .then((p) => setUnits(p.units))
        .catch(() => setUnits([]));
    else setUnits([]);
  }, [form.property_id]);
  useEffect(() => {
    if (data && params.get("record"))
      document
        .getElementById(`maintenance-${params.get("record")}`)
        ?.scrollIntoView({ block: "center" });
  }, [data, params]);
  const rows = (data || []).filter(
    (m) =>
      `${m.title} ${m.property_name} ${m.description || ""}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()) &&
      (!filter || m.status === filter) &&
      (!property || String(m.property_id) === property),
  );
  function edit(m: any) {
    setEditing(m.id);
    setForm({
      ...m,
      property_id: String(m.property_id),
      unit_id: m.unit_id ? String(m.unit_id) : "",
      due_date: m.due_date ? businessDateTimeInput(m.due_date) : "",
    });
    setOpen(true);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailure("");
    try {
      const body = {
        ...form,
        property_id: Number(form.property_id),
        unit_id: form.unit_id ? Number(form.unit_id) : null,
        due_date: form.due_date ? businessDateTimeIso(form.due_date) : null,
      };
      if (editing) await api.put(`${base}/maintenance/${editing}`, body);
      else await api.post(`${base}/maintenance`, body);
      setMessage(
        editing
          ? tr("Maintenance request saved")
          : tr("Maintenance request created"),
      );
      setOpen(false);
      refresh();
    } catch (e) {
      setFailure(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function archive() {
    if (!confirm) return;
    setBusy(true);
    try {
      await api.delete(`${base}/maintenance/${confirm.id}`);
      setUndo(confirm);
      setConfirm(null);
      setMessage(tr("Maintenance request archived. You can undo this action."));
      refresh();
    } catch (e) {
      setFailure(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    setBusy(true);
    try {
      await api.post(`${base}/maintenance/${undo.id}/restore`);
      setUndo(null);
      setMessage(tr("Maintenance request restored"));
      refresh();
    } catch (e) {
      setFailure(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="quiet-workspace mx-auto max-w-7xl space-y-5"
      dir={direction()}
    >
      <PageHead
        icon={PageTitleIcon}
        title={tr("Maintenance")}
        description={tr(
          "Track maintenance requests, priorities and due dates, with private invoice attachments.",
        )}
      >
        {can("expenses", "create") && (
          <AddButton
            onClick={() => {
              setEditing(null);
              setForm(blank);
              setFailure("");
              setOpen(true);
            }}
          >
            {tr("Maintenance request")}{" "}
          </AddButton>
        )}
      </PageHead>
      <Notice message={message} />
      <Notice message={error || failure} error />
      {undo && (
        <button className="btn" disabled={busy} onClick={() => void restore()}>
          <Undo2 size={17} />
          {tr('Undo archive: "')} {undo.title}»
        </button>
      )}
      <FilterPanel
        search={
          <label className="text-xs font-bold">
            {tr("Search maintenance")}
            <input
              className="field"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr("Request title or property")}
            />
          </label>
        }
        activeCount={Number(!!filter) + Number(!!property)}
        onClear={() => {
          setFilter("");
          setProperty("");
        }}
      >
        {" "}
        <label className="min-w-40 flex-1 text-xs">
          {" "}
          {tr("Status")}{" "}
          <select
            className="field"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">{tr("All statuses")}</option>
            {Object.entries(states).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-40 flex-1 text-xs">
          {" "}
          {tr("Property")}{" "}
          <select
            className="field"
            value={property}
            onChange={(e) => setProperty(e.target.value)}
          >
            <option value="">{tr("All properties")}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </FilterPanel>
      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>
          {" "}
          {tr(
            "No matching maintenance requests. Create a request when needed.",
          )}{" "}
        </Empty>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {rows.map((m) => (
            <article
              id={`maintenance-${m.id}`}
              key={m.id}
              className={`panel space-y-4 p-5 ${params.get("record") === String(m.id) ? "ring-2 ring-amber-400" : ""}`}
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-black">
                    <Wrench size={18} />
                    {m.title}
                  </h2>
                  <Link
                    to={`/properties/${m.property_id}`}
                    className="mt-2 inline-block text-xs font-bold text-emerald-700 underline"
                  >
                    {m.property_name}
                  </Link>
                  {m.unit_id && (
                    <Link
                      className="ms-3 text-xs underline"
                      to={`/units/${m.unit_id}`}
                    >
                      {" "}
                      {tr("Linked unit")}{" "}
                    </Link>
                  )}
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs">
                  {states[m.status]}
                </span>
              </header>
              <div className="flex flex-wrap gap-4 text-xs">
                <span>
                  {" "}
                  {tr("Priority:")}
                  <strong>{priorities[m.priority]}</strong>
                </span>
                <span>
                  {" "}
                  {tr("Due:")}{" "}
                  {m.due_date ? day(m.due_date) : tr("Not specified")}
                </span>
              </div>
              <QuietSection title={tr("Details and attachments")}>
                {" "}
                <p className="whitespace-pre-wrap text-sm muted">
                  {m.description || tr("No description provided")}
                </p>
                <Attachments resource="maintenance" id={m.id} />
              </QuietSection>
              <div className="flex flex-wrap gap-2">
                {can("expenses", "update") && (
                  <button className="btn" onClick={() => edit(m)}>
                    {" "}
                    {tr("Edit / update status")}{" "}
                  </button>
                )}
                <QuietSection
                  title={tr("More actions")}
                  className="quiet-actions"
                >
                  {" "}
                  {can("expenses", "delete") && (
                    <button
                      className="btn btn-danger"
                      onClick={() => setConfirm(m)}
                    >
                      {" "}
                      {tr("Archive")}{" "}
                    </button>
                  )}
                  <Link
                    className="btn"
                    to={`/payments?property_id=${m.property_id}${m.unit_id ? `&unit_id=${m.unit_id}` : ""}`}
                  >
                    {" "}
                    {tr("Record actual expense")}{" "}
                  </Link>
                </QuietSection>
              </div>
            </article>
          ))}
        </div>
      )}
      {open && (
        <Modal
          title={
            editing
              ? tr("Update maintenance request")
              : tr("New maintenance request")
          }
          onClose={() => setOpen(false)}
        >
          <form className="space-y-4" onSubmit={save}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                {" "}
                {tr("Property")}{" "}
                <select
                  required
                  className="field"
                  value={form.property_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      property_id: e.target.value,
                      unit_id: "",
                    })
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
              <label className="text-sm">
                {" "}
                {tr("Unit (optional)")}{" "}
                <select
                  className="field"
                  value={form.unit_id}
                  onChange={(e) =>
                    setForm({ ...form, unit_id: e.target.value })
                  }
                >
                  <option value="">{tr("Whole property")}</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.number}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm">
              {" "}
              {tr("Request title")}{" "}
              <input
                required
                minLength={2}
                maxLength={150}
                className="field"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              {" "}
              {tr("Description")}{" "}
              <textarea
                className="field"
                rows={3}
                maxLength={5000}
                value={form.description || ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                {" "}
                {tr("Priority")}{" "}
                <select
                  className="field"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  {Object.entries(priorities).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                {" "}
                {tr("Status")}{" "}
                <select
                  className="field"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {Object.entries(states).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                {" "}
                {tr("Follow-up date")}{" "}
                <LocalizedInput
                  className="field"
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm({ ...form, due_date: e.target.value })
                  }
                />
              </label>
            </div>
            <Notice message={failure} error />
            <p className="muted text-xs">
              {" "}
              {tr(
                "Record the actual maintenance cost in Collections & expenses.",
              )}{" "}
            </p>
            <button disabled={busy} className="btn btn-primary">
              {busy ? tr("Saving\u2026") : tr("Save request")}
            </button>
          </form>
        </Modal>
      )}
      {confirm && (
        <Modal title={tr("Confirm archive")} onClose={() => setConfirm(null)}>
          <p className="mb-5 text-sm leading-7">
            {" "}
            {tr('Archive request "')} {confirm.title}{" "}
            {tr(
              '"? It will leave the active list. You can undo this action; the record will be preserved.',
            )}{" "}
          </p>
          <button
            disabled={busy}
            className="btn btn-danger"
            onClick={() => void archive()}
          >
            {" "}
            {tr("Confirm archive")}{" "}
          </button>
        </Modal>
      )}
    </div>
  );
}
