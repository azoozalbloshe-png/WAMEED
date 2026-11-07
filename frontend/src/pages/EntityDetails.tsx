import QuietSection from "../components/platform/QuietSection";
import RecordLifecycleActions from "../components/platform/RecordLifecycleActions";
import AddButton from "../components/platform/AddButton";
import {
  Building2 as PropertyTitleIcon,
  DoorOpen as UnitTitleIcon,
  UserRound as TenantTitleIcon,
  FileText as ContractTitleIcon,
} from "lucide-react";
import LocalizedInput from "../components/platform/LocalizedInput";
import { useLanguage as useUiLanguage } from "../contexts/LanguageContext";
import { tr, direction } from "../i18n/runtime";
import { FormEvent, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Save } from "lucide-react";
import { platform, base } from "../services/platform";
import api from "../services/api";
import {
  useData,
  Loading,
  Notice,
  PageHead,
  Empty,
  errorText,
  money,
  day,
  Modal,
} from "../components/platform/UI";
import Attachments from "../components/platform/Attachments";
import { usePermissions } from "../contexts/PermissionsContext";
const link = "text-sm font-bold text-emerald-700 underline underline-offset-4";
const statuses: Record<string, string> = {
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
  get available() {
    return tr("Vacant");
  },
  get occupied() {
    return tr("Occupied");
  },
  get maintenance() {
    return tr("Under maintenance");
  },
};
function ContractList({ rows }: { rows: any[] }) {
  useUiLanguage();
  return rows.length ? (
    <div className="overflow-x-auto">
      <table className="w-full text-start text-sm">
        <thead>
          <tr>
            {[
              tr("Contract"),
              tr("Tenant"),
              tr("Period"),
              tr("Monthly rent"),
              tr("Status"),
              tr("Unit"),
            ].map((t) => (
              <th className="p-3" key={t}>
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr className="border-t" key={c.id}>
              <td className="p-3">
                <Link className={link} to={`/contracts/${c.id}`}>
                  #{c.id}
                </Link>
              </td>
              <td className="p-3">
                <Link className={link} to={`/tenants/${c.tenant_id}`}>
                  {c.tenant_name}
                </Link>
              </td>
              <td className="p-3">
                {day(c.start_date)} — {day(c.end_date)}
              </td>
              <td className="p-3">{money(c.monthly_rent)}</td>
              <td className="p-3">{statuses[c.status] || c.status}</td>
              <td className="p-3">
                {c.unit_id ? (
                  <Link to={`/units/${c.unit_id}`} className={link}>
                    {" "}
                    {tr("View unit")}{" "}
                  </Link>
                ) : (
                  tr("No unit linked")
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty>{tr("No linked contracts registered.")}</Empty>
  );
}
export default function EntityDetails({
  kind,
}: {
  kind: "property" | "unit" | "tenant" | "contract";
}) {
  useUiLanguage();
  const { id = "" } = useParams();
  const {
    data: d,
    error,
    loading,
    refresh,
  } = useData(() => platform[kind](id), [kind, id]);
  const navigate = useNavigate();
  const [showArchivedUnits, setShowArchivedUnits] = useState(false);
  const { can } = usePermissions();
  const [message, setMessage] = useState(""),
    [failure, setFailure] = useState(""),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false),
    [unit, setUnit] = useState({
      number: "",
      floor: "",
      description: "",
      status: "available",
    }),
    [units, setUnits] = useState<any[]>([]),
    [unitId, setUnitId] = useState(""),
    [renewal, setRenewal] = useState({
      start_date: "",
      end_date: "",
      monthly_rent: "",
    }),
    [editing, setEditing] = useState(false),
    [propertyForm, setPropertyForm] = useState<any>({});
  useEffect(() => {
    setMessage("");
    setFailure("");
    setOpen(false);
    setEditing(false);
  }, [kind, id]);
  useEffect(() => {
    if (!d) return;
    if (kind === "contract") {
      setUnitId(d.unit_id ? String(d.unit_id) : "");
      platform
        .property(String(d.property_id))
        .then((p) => setUnits(p.units.filter((u: any) => !u.archived_at)))
        .catch(() => setUnits([]));
      setRenewal({
        start_date: "",
        end_date: "",
        monthly_rent: String(d.monthly_rent),
      });
    }
    if (kind === "unit")
      setUnit({
        number: d.number,
        floor: d.floor || "",
        description: d.description || "",
        status: d.status === "occupied" ? "available" : d.status,
      });
    if (kind === "property")
      setPropertyForm({
        name: d.name,
        description: d.description || "",
        address: d.address || "",
        city: d.city || "",
        total_units: d.total_units,
      });
  }, [d, kind]);
  async function action(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setFailure("");
    setMessage("");
    try {
      await fn();
      setMessage(success);
      setOpen(false);
      setEditing(false);
      refresh();
    } catch (e) {
      setFailure(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading && !d) return <Loading />;
  if (error || !d)
    return (
      <div className="space-y-4">
        <Notice message={error || tr("Record not found")} error />
        <button className="btn" onClick={refresh}>
          {" "}
          {tr("Retry")}{" "}
        </button>
      </div>
    );
  return (
    <div className="quiet-record-detail mx-auto max-w-7xl space-y-6" dir={direction()}>
      <Link
        className="btn"
        to={
          kind === "property"
            ? "/properties"
            : kind === "unit"
              ? `/properties/${d.property_id}`
              : kind === "tenant"
                ? "/tenants"
                : "/contracts"
        }
      >
        <ArrowLeft size={17} />
        {tr("Back")}{" "}
      </Link>
      <PageHead
        icon={
          kind === "property"
            ? PropertyTitleIcon
            : kind === "unit"
              ? UnitTitleIcon
              : kind === "tenant"
                ? TenantTitleIcon
                : ContractTitleIcon
        }
        title={
          kind === "property"
            ? d.name
            : kind === "unit"
              ? "" + tr("Unit ") + d.number
              : kind === "tenant"
                ? d.name
                : "" + tr("Contract #") + d.id
        }
        description={
          kind === "property"
            ? [d.city, d.address].filter(Boolean).join(" · ") ||
              tr("Location not specified")
            : kind === "unit"
              ? d.property_name
              : kind === "contract"
                ? `${d.tenant_name} · ${d.property_name}`
                : tr("Tenant profile and linked contracts")
        }
      >
        {(kind === "property" || kind === "unit") && (
          <RecordLifecycleActions
            compact={kind === "property"}
            resource={kind === "property" ? "properties" : "units"}
            id={Number(id)}
            name={kind === "property" ? d.name : tr("Unit") + " " + d.number}
            archived={!!d.archived_at}
            onChanged={refresh}
            onDeleted={() =>
              navigate(
                kind === "property"
                  ? "/properties"
                  : `/properties/${d.property_id}`,
              )
            }
          />
        )}
      </PageHead>
      {d.archived_at && (
        <p role="status" className="panel p-4 text-sm">
          {tr("Archived record. Its linked history is preserved.")}
        </p>
      )}
      <Notice message={message} />
      <Notice message={failure} error />
      {kind === "property" && (
        <>
          <section className="panel space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-black">{tr("Property details")}</h2>
              {can("properties", "update") && (
                <button className="btn" onClick={() => setEditing(!editing)}>
                  {" "}
                  {tr("Edit details")}{" "}
                </button>
              )}
            </div>
            {d.description && (
              <p className="muted whitespace-pre-wrap text-sm leading-7">
                {d.description}
              </p>
            )}
            {editing && (
              <form
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(
                    () => api.put(`${base}/properties/${id}`, propertyForm),
                    tr("Property details saved"),
                  );
                }}
              >
                {[
                  ["name", tr("Property name")],
                  ["address", tr("Address")],
                  ["city", tr("City")],
                  ["description", tr("Description")],
                  ["total_units", tr("Total number of units")],
                ].map(([key, label]) => (
                  <label className="text-sm" key={key}>
                    {label}
                    <input
                      required={key === "name"}
                      className="field"
                      type={key === "total_units" ? "number" : "text"}
                      min={key === "total_units" ? d.units.length : undefined}
                      value={propertyForm[key] ?? ""}
                      onChange={(e) =>
                        setPropertyForm({
                          ...propertyForm,
                          [key]:
                            key === "total_units"
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                    />
                  </label>
                ))}
                <button className="btn btn-primary self-end" disabled={busy}>
                  <Save size={16} />
                  {tr("Save")}{" "}
                </button>
              </form>
            )}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                [tr("Total units"), d.total_units],
                [
                  tr("Detailed units"),
                  d.units.filter((u: any) => !u.archived_at).length,
                ],
                [
                  tr("Occupied by a linked contract"),
                  d.units.filter(
                    (u: any) => !u.archived_at && u.status === "occupied",
                  ).length,
                ],
                [
                  tr("Confirmed vacant"),
                  d.units.filter(
                    (u: any) => !u.archived_at && u.status === "available",
                  ).length,
                ],
              ].map(([label, value]) => (
                <div
                  className="rounded-xl bg-emerald-500/5 p-4"
                  key={label as string}
                >
                  <p className="muted text-xs">{label}</p>
                  <strong className="mt-2 block text-2xl">{value}</strong>
                </div>
              ))}
            </div>
            {d.unassigned_active_contracts > 0 && (
              <Notice
                message={
                  "" +
                  tr("There are ") +
                  d.unassigned_active_contracts +
                  tr(
                    " active contracts without a unit. Link them to their actual units for accurate occupancy. Unregistered units are not assumed vacant.",
                  )
                }
              />
            )}
            <details className="property-secondary rounded-xl border border-[var(--wameed-border)] p-3">
              <summary className="cursor-pointer text-sm font-bold">
                {tr("Photos and attachments")}
              </summary>
              <div className="mt-4">
                <Attachments resource="properties" id={d.id} photos />
              </div>
            </details>
          </section>
          <section className="panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-black">{tr("Units")}</h2>
              {!d.archived_at && can("properties", "create") && (
                <AddButton
                  onClick={() => {
                    setUnit({
                      number: "",
                      floor: "",
                      description: "",
                      status: "available",
                    });
                    setOpen(true);
                  }}
                >
                  {tr("Add unit")}{" "}
                </AddButton>
              )}
            </div>
            <button
              className="mb-2 inline-flex min-h-11 items-center text-xs font-bold muted"
              aria-pressed={showArchivedUnits}
              onClick={() => setShowArchivedUnits(!showArchivedUnits)}
            >
              {tr(
                showArchivedUnits ? "Show active units" : "Show archived units",
              )}
            </button>
            {d.units.filter((u: any) => !!u.archived_at === showArchivedUnits)
              .length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {d.units
                  .filter((u: any) => !!u.archived_at === showArchivedUnits)
                  .map((u: any) => (
                    <Link
                      className="panel space-y-2 p-4 hover:border-emerald-500"
                      key={u.id}
                      to={`/units/${u.id}`}
                    >
                      <Building2 size={21} />
                      <h3 className="font-bold">
                        {tr("Unit")} {u.number}
                      </h3>
                      <p className="text-xs muted">
                        {statuses[u.status]}
                        {u.floor ? "" + tr(" \u00B7 Floor ") + u.floor : ""}
                      </p>
                      {u.tenant && <p className="text-xs">{u.tenant}</p>}
                    </Link>
                  ))}
              </div>
            ) : (
              <Empty>
                {" "}
                {tr(
                  showArchivedUnits
                    ? "No archived units."
                    : "No detailed units yet. Enter the actual unit numbers, then link their contracts.",
                )}{" "}
              </Empty>
            )}
          </section>
          {d.finance && (
            <details className="panel property-secondary p-5">
              <summary className="cursor-pointer font-black">
                {tr("Financial performance through today")}
              </summary>
              <div className="mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["month", tr("This month")],
                    ["year", tr("This year")],
                  ].map(([key, label]) => (
                    <div key={key} className="rounded-xl border p-4">
                      <h3 className="mb-3 text-sm font-bold">{label}</h3>
                      {[
                        ["revenue", tr("Contractual revenue")],
                        ["collections", tr("Collections")],
                        ["expenses", tr("Expenses")],
                        ["net_income", tr("Net income")],
                        ["cash_net", tr("Net cash")],
                      ].map(([field, name]) => (
                        <p
                          key={field}
                          className="flex justify-between gap-3 py-2 text-sm"
                        >
                          <span className="muted">{name}</span>
                          <strong>{money(d.finance[key][field])}</strong>
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
                <Link
                  className={`${link} mt-4 inline-block`}
                  to={`/reports?property_id=${id}`}
                >
                  {" "}
                  {tr("Property financial reports")}{" "}
                </Link>
              </div>
            </details>
          )}
          {can("tenants") && (
            <details className="panel property-secondary p-5">
              <summary className="cursor-pointer font-black">
                {tr("Tenants")}{" "}
                <span className="muted text-sm font-normal">
                  ({d.tenants.length})
                </span>
              </summary>
              <div className="mt-4">
                {d.tenants.length ? (
                  <div className="flex flex-wrap gap-3">
                    {d.tenants.map((t: any) => (
                      <Link className="btn" key={t.id} to={`/tenants/${t.id}`}>
                        {t.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="muted text-sm">
                    {" "}
                    {tr("No tenant records are available.")}{" "}
                  </p>
                )}
              </div>
            </details>
          )}
          {can("contracts") && (
            <details className="panel property-secondary p-5">
              <summary className="cursor-pointer font-black">
                {tr("Linked contracts")}{" "}
                <span className="muted text-sm font-normal">
                  ({d.contracts.length})
                </span>
              </summary>
              <div className="mt-4">
                <ContractList rows={d.contracts} />
              </div>
            </details>
          )}
          {can("meters") && (
            <details className="panel property-secondary p-5">
              <summary className="cursor-pointer font-black">
                {tr("Property meters")}{" "}
                <span className="muted text-sm font-normal">
                  ({d.meters.length})
                </span>
              </summary>
              <div className="mt-4">
                {d.meters.map((m: any) => (
                  <Link
                    className="btn m-1"
                    key={m.id}
                    to={`/calculation?meter=${m.id}`}
                  >
                    {m.meter_number} {tr("\u00B7 Reading")} {m.current_reading}
                  </Link>
                ))}
                {!d.meters.length && (
                  <p className="muted text-sm">
                    {tr("No meters are available.")}
                  </p>
                )}
              </div>
            </details>
          )}
          <div className="flex flex-wrap gap-3">
            <Link
              className={`${link} inline-flex min-h-11 items-center`}
              to={`/payments?property_id=${id}`}
            >
              {" "}
              {tr("Expenses, collections & invoices")}{" "}
            </Link>
            <Link
              className={`${link} inline-flex min-h-11 items-center`}
              to={`/maintenance?property_id=${id}`}
            >
              {" "}
              {tr("Property maintenance")}{" "}
            </Link>
          </div>
        </>
      )}
      {kind === "unit" && (
        <>
          <section className="panel space-y-4 p-5">
            <Link className={link} to={`/properties/${d.property_id}`}>
              {d.property_name}
            </Link>
            <p>
              {" "}
              {tr("Status:")}
              <strong>{statuses[d.status]}</strong>
            </p>
            {d.description && <p className="muted text-sm">{d.description}</p>}
            {d.tenant_id && (
              <Link className="btn" to={`/tenants/${d.tenant_id}`}>
                {" "}
                {tr("Tenant profile:")} {d.tenant}
              </Link>
            )}
            {d.contract_id && (
              <Link className="btn ms-2" to={`/contracts/${d.contract_id}`}>
                {" "}
                {tr("Current contract")}{" "}
              </Link>
            )}
            {can("properties", "update") && (
              <button className="btn" onClick={() => setOpen(true)}>
                {" "}
                {tr("Edit unit")}{" "}
              </button>
            )}
          </section>
          <section className="panel p-5">
            <h2 className="mb-4 font-black">{tr("Unit contracts")}</h2>
            <ContractList rows={d.contracts} />
          </section>
          <QuietSection title={tr("Unit expenses")}>
            {d.expenses.map((e: any) => (
              <p key={e.id} className="border-b py-3 text-sm">
                {e.category} · {day(e.spent_at)} · {money(e.amount)}
              </p>
            ))}
            {!d.expenses.length && (
              <p className="muted text-sm">
                {" "}
                {tr("No expenses linked to this unit.")}{" "}
              </p>
            )}
            <Link
              className={`${link} mt-4 inline-block`}
              to={`/payments?property_id=${d.property_id}&unit_id=${id}`}
            >
              {" "}
              {tr("Record expense")}{" "}
            </Link>
          </QuietSection>
          <section className="panel p-5">
            <h2 className="mb-4 font-black">{tr("Maintenance")}</h2>
            {d.maintenance.map((m: any) => (
              <Link
                key={m.id}
                className="btn m-1"
                to={`/maintenance?record=${m.id}`}
              >
                {m.title}
              </Link>
            ))}
            <Link
              className="btn"
              to={`/maintenance?property_id=${d.property_id}&unit_id=${id}`}
            >
              {" "}
              {tr("Track maintenance")}{" "}
            </Link>
          </section>
        </>
      )}
      {kind === "tenant" && (
        <>
          <section className="panel space-y-3 p-5">
            <p>
              {" "}
              {tr("Phone:")}
              <span dir="ltr">{d.phone || tr("Not registered")}</span>
            </p>
            <p>
              {tr("Email:")} {d.email || tr("Not registered")}
            </p>
            <Link className={link} to={`/properties/${d.property_id}`}>
              {" "}
              {tr("View property")}{" "}
            </Link>
          </section>
          <section className="panel p-5">
            <h2 className="mb-4 font-black">{tr("Contracts")}</h2>
            <ContractList rows={d.contracts} />
          </section>
        </>
      )}
      {kind === "contract" && (
        <>
          <section className="panel space-y-4 p-5">
            <div className="flex flex-wrap gap-3">
              <Link className="btn" to={`/properties/${d.property_id}`}>
                {" "}
                {tr("Property:")} {d.property_name}
              </Link>
              <Link className="btn" to={`/tenants/${d.tenant_id}`}>
                {" "}
                {tr("Tenant:")} {d.tenant_name}
              </Link>
              {d.unit_id && (
                <Link className="btn" to={`/units/${d.unit_id}`}>
                  {" "}
                  {tr("Linked unit")}{" "}
                </Link>
              )}
            </div>
            <p className="text-sm">
              {day(d.start_date)} — {day(d.end_date)} · {statuses[d.status]} ·{" "}
              {money(d.monthly_rent)} {tr("per month")}{" "}
            </p>
            {d.notes && <p className="muted text-sm">{d.notes}</p>}
            {can("contracts", "update") && (
              <QuietSection title={tr("Link unit")} initialOpen={!d.unit_id}>
                <form
                  className="flex flex-wrap items-end gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(
                      () =>
                        api.put(`${base}/contracts/${id}/unit`, {
                          unit_id: unitId ? Number(unitId) : null,
                        }),
                      tr("Unit link updated"),
                    );
                  }}
                >
                  <label className="min-w-48 flex-1 text-sm">
                    {" "}
                    {tr("Link contract to a unit")}{" "}
                    <select
                      className="field"
                      value={unitId}
                      onChange={(e) => setUnitId(e.target.value)}
                    >
                      <option value="">{tr("No unit linked")}</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {" "}
                          {tr("Unit")} {u.number} · {statuses[u.status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button disabled={busy} className="btn btn-primary">
                    {" "}
                    {tr("Save link")}{" "}
                  </button>
                </form>
              </QuietSection>
            )}
          </section>
          <section className="panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-black">
                {" "}
                {tr("Outstanding contractual installments")}{" "}
              </h2>
              <Link className="btn" to={`/payments?contract_id=${id}`}>
                {" "}
                {tr("Record payment")}{" "}
              </Link>
            </div>
            <p className="muted mb-4 text-xs leading-7">
              {" "}
              {tr(
                "Installments are calculated monthly from the contract start, allocating payments oldest first and prorating the final period. This is contractual tracking, not a bank reconciliation.",
              )}{" "}
            </p>
            {d.dues.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <thead>
                    <tr>
                      {[
                        tr("Due date"),
                        tr("Amount"),
                        tr("Outstanding"),
                        tr("Status"),
                      ].map((x) => (
                        <th className="p-3" key={x}>
                          {x}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.dues.map((v: any) => (
                      <tr key={v.due_date} className="border-t">
                        <td className="p-3">{day(v.due_date)}</td>
                        <td className="p-3">{money(v.amount)}</td>
                        <td className="p-3">{money(v.outstanding)}</td>
                        <td className="p-3">
                          {v.overdue
                            ? tr("Overdue")
                            : tr("Upcoming / due today")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>{tr("No outstanding installments are available.")}</Empty>
            )}
          </section>
          <QuietSection title={tr("Recorded collections")}>
            {d.payments.map((p: any) => (
              <p className="border-b py-3 text-sm" key={p.id}>
                {day(p.paid_at)} · {money(p.amount)}
              </p>
            ))}
            {!d.payments.length && (
              <p className="text-sm muted">
                {tr("No collections are available.")}
              </p>
            )}
          </QuietSection>
          {can("contracts", "create") && (
            <QuietSection title={tr("Renew contract")}>
              <p className="muted my-3 text-xs leading-7">
                {" "}
                {tr(
                  "Renewal creates a new contract and preserves the old contract and its payments. Overlapping contract periods are blocked.",
                )}{" "}
              </p>
              <form
                className="grid gap-3 sm:grid-cols-3"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  setOpen(true);
                }}
              >
                {[
                  ["start_date", tr("Renewal start"), "date"],
                  ["end_date", tr("Renewal end"), "date"],
                  ["monthly_rent", tr("Monthly rent"), "number"],
                ].map(([key, label, type]) => (
                  <label className="text-sm" key={key}>
                    {label}
                    <LocalizedInput
                      required
                      type={type}
                      lang={["number", "tel"].includes(type) ? "en" : undefined}
                      className="field"
                      min={type === "number" ? "0.01" : undefined}
                      step={type === "number" ? "0.01" : undefined}
                      value={(renewal as any)[key]}
                      onChange={(e) =>
                        setRenewal({ ...renewal, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
                <button className="btn btn-primary" disabled={busy}>
                  {" "}
                  {tr("Review renewal")}{" "}
                </button>
              </form>
            </QuietSection>
          )}
        </>
      )}
      {open && (
        <Modal
          title={
            kind === "contract"
              ? tr("Confirm contract renewal")
              : kind === "property"
                ? tr("Add unit")
                : tr("Edit unit")
          }
          onClose={() => setOpen(false)}
        >
          {kind === "contract" ? (
            <div className="space-y-4">
              <p className="text-sm leading-7">
                {" "}
                {tr("Create a new contract for")} {renewal.start_date} —{" "}
                {renewal.end_date} {tr("at a monthly rent of")}{" "}
                {money(Number(renewal.monthly_rent))} {tr("?")}{" "}
              </p>
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() =>
                  void action(
                    () =>
                      api.post(`${base}/contracts/${id}/renew`, {
                        ...renewal,
                        monthly_rent: Number(renewal.monthly_rent),
                      }),
                    tr("Renewal saved as a new contract"),
                  )
                }
              >
                {" "}
                {tr("Confirm renewal")}{" "}
              </button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void action(
                  () =>
                    kind === "property"
                      ? api.post(`${base}/properties/${id}/units`, unit)
                      : api.put(`${base}/units/${id}`, unit),
                  kind === "property" ? tr("Unit added") : tr("Unit saved"),
                );
              }}
            >
              {[
                ["number", tr("Unit number")],
                ["floor", tr("Floor")],
                ["description", tr("Description")],
              ].map(([key, label]) => (
                <label key={key} className="block text-sm">
                  {label}
                  <input
                    required={key === "number"}
                    className="field"
                    value={(unit as any)[key]}
                    onChange={(e) =>
                      setUnit({ ...unit, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <label className="block text-sm">
                {" "}
                {tr("Status without an active contract")}{" "}
                <select
                  className="field"
                  value={unit.status}
                  onChange={(e) => setUnit({ ...unit, status: e.target.value })}
                >
                  <option value="available">{tr("Available to rent")}</option>
                  <option value="maintenance">{tr("Under maintenance")}</option>
                </select>
              </label>
              <Notice message={failure} error />
              <button className="btn btn-primary" disabled={busy}>
                {" "}
                {tr("Save unit")}{" "}
              </button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
