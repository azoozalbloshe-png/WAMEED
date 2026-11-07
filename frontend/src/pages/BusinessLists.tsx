import { FilterPanel } from "../components/platform/QuietSection";
import AddButton from "../components/platform/AddButton";
import {
  Users as TenantsTitleIcon,
  FileText as ContractsTitleIcon,
} from "lucide-react";
import LocalizedInput from "../components/platform/LocalizedInput";
import { useLanguage as useUiLanguage } from "../contexts/LanguageContext";
import { tr, direction } from "../i18n/runtime";
import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { realEstateService } from "../services/realEstateService";
import { platform } from "../services/platform";
import { usePermissions } from "../contexts/PermissionsContext";
import {
  Empty,
  Loading,
  Modal,
  Notice,
  PageHead,
  errorText,
  money,
  day,
  useData,
} from "../components/platform/UI";
const states: Record<string, string> = {
  get active() {
    return tr("Active");
  },
  get upcoming() {
    return tr("Upcoming");
  },
  get inactive() {
    return tr("Inactive");
  },
  get cancelled() {
    return tr("Cancelled");
  },
  get expired() {
    return tr("Expired");
  },
};
function List({ kind }: { kind: "tenants" | "contracts" }) {
  useUiLanguage();
  const [params, setParams] = useSearchParams();
  const { can, loading: permissionsLoading } = usePermissions();
  const { data, error, loading, refresh } = useData(async () => {
    const [properties, tenants, contracts] = await Promise.all([
      can("properties") ? realEstateService.getProperties() : [],
      can("tenants") ? realEstateService.getTenants() : [],
      can("contracts") ? realEstateService.getContracts() : [],
    ]);
    return { properties, tenants, contracts };
  }, [permissionsLoading]);
  const [query, setQuery] = useState(params.get("q") || ""),
    [property, setProperty] = useState(params.get("property_id") || ""),
    [status, setStatus] = useState(""),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failure, setFailure] = useState(""),
    [units, setUnits] = useState<any[]>([]);
  const createRequested = params.get("action") === "create";
  const canCreate = can(kind, "create");
  useEffect(() => {
    if (!createRequested || permissionsLoading || !canCreate) return;
    setFailure("");
    setOpen(true);
    const next = new URLSearchParams(params);
    next.delete("action");
    setParams(next, { replace: true });
  }, [createRequested, permissionsLoading, canCreate, params, setParams]);
  const tenantBlank = {
    name: "",
    phone: "",
    email: "",
    national_id: "",
    property_id: "",
    contract_start_date: "",
    contract_end_date: "",
    monthly_rent: "",
    deposit_amount: "0",
  };
  const contractBlank = {
    property_id: "",
    tenant_id: "",
    unit_id: "",
    start_date: "",
    end_date: "",
    monthly_rent: "",
    deposit_amount: "0",
    notes: "",
  };
  const [form, setForm] = useState<Record<string, string>>(
    kind === "tenants" ? tenantBlank : contractBlank,
  );
  useEffect(() => {
    if (kind === "contracts" && form.property_id)
      platform
        .property(form.property_id)
        .then((p) => setUnits(p.units))
        .catch(() => setUnits([]));
    else setUnits([]);
  }, [form.property_id, kind]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailure("");
    try {
      const body: any = {
        ...form,
        property_id: Number(form.property_id),
        monthly_rent: Number(form.monthly_rent),
        deposit_amount: Number(form.deposit_amount),
      };
      if (kind === "tenants") {
        body.email = form.email || null;
        for (const k of ["contract_start_date", "contract_end_date"])
          body[k] = new Date(form[k]).toISOString();
        await realEstateService.createTenant(body);
      } else {
        body.tenant_id = Number(form.tenant_id);
        body.unit_id = form.unit_id ? Number(form.unit_id) : null;
        for (const k of ["start_date", "end_date"])
          body[k] = new Date(form[k]).toISOString();
        await realEstateService.createContract(body);
      }
      setMessage(
        kind === "tenants" ? tr("Tenant saved") : tr("Contract saved"),
      );
      setOpen(false);
      setForm(kind === "tenants" ? tenantBlank : contractBlank);
      refresh();
    } catch (e) {
      setFailure(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const list = (kind === "tenants" ? data?.tenants : data?.contracts) || [];
  const filtered = list.filter((r: any) => {
    const actualStatus =
      kind === "contracts" &&
      r.status === "active" &&
      r.end_date.slice(0, 10) <
        new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" })
        ? "expired"
        : r.status;
    return (
      (!property || String(r.property_id) === property) &&
      (!status || actualStatus === status) &&
      `${r.name || ""} ${r.phone || ""} ${r.id} ${r.tenant_name || ""} ${r.property_name || ""}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  });
  const fields =
    kind === "tenants"
      ? [
          ["name", tr("Tenant name"), "text"],
          ["phone", tr("Phone"), "tel"],
          ["email", tr("Email address"), "email"],
          ["national_id", tr("ID number"), "text"],
          ["contract_start_date", tr("Rental start"), "date"],
          ["contract_end_date", tr("Rental end"), "date"],
          ["monthly_rent", tr("Monthly rent"), "number"],
          ["deposit_amount", tr("Security deposit"), "number"],
        ]
      : [
          ["start_date", tr("Contract start"), "date"],
          ["end_date", tr("Contract end"), "date"],
          ["monthly_rent", tr("Monthly rent"), "number"],
          ["deposit_amount", tr("Security deposit"), "number"],
          ["notes", tr("Notes"), "text"],
        ];
  return (
    <section
      className="quiet-workspace mx-auto max-w-7xl space-y-5"
      dir={direction()}
    >
      <PageHead
        icon={kind === "tenants" ? TenantsTitleIcon : ContractsTitleIcon}
        title={kind === "tenants" ? tr("Tenants") : tr("Contracts")}
        description={
          kind === "tenants"
            ? tr("Registered tenants, their profiles and linked contracts.")
            : tr("Your registered contracts, dates, installments and renewals.")
        }
      >
        {can(kind, "create") && (
          <AddButton
            onClick={() => {
              setFailure("");
              setOpen(true);
            }}
          >
            {kind === "tenants" ? tr("Add tenant") : tr("Add contract")}
          </AddButton>
        )}
      </PageHead>
      <Notice message={message} />
      <Notice message={error || failure} error />
      <FilterPanel
        search={
          <label className="text-xs font-bold">
            {" "}
            {tr("Search")}{" "}
            <input
              className="field"
              aria-label={
                kind === "tenants"
                  ? tr("Search tenants")
                  : tr("Search contracts")
              }
              placeholder={tr("Name or number\u2026")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        }
        activeCount={Number(!!property) + Number(!!status)}
        onClear={() => {
          setProperty("");
          setStatus("");
        }}
      >
        <label className="text-xs font-bold">
          {" "}
          {tr("Property")}{" "}
          <select
            className="field"
            value={property}
            onChange={(e) => setProperty(e.target.value)}
          >
            <option value="">{tr("All properties")}</option>
            {data?.properties.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          {" "}
          {tr("Status")}{" "}
          <select
            className="field"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">{tr("All statuses")}</option>
            {Object.entries(states).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </FilterPanel>
      {loading || permissionsLoading ? (
        <Loading />
      ) : !can(kind) ? (
        <Notice
          message={tr("You do not have permission to view this section.")}
          error
        />
      ) : filtered.length === 0 ? (
        <Empty>
          {" "}
          {tr(
            "No matching records. Adjust your filters or add a record if your role allows it.",
          )}{" "}
        </Empty>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any) => (
            <Link
              key={r.id}
              to={`/${kind}/${r.id}`}
              className="panel quiet-record grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0 space-y-1">
                <h2 className="break-words font-black">
                  {kind === "tenants"
                    ? r.name
                    : `${tr("Contract #")}${r.id} · ${r.tenant_name}`}
                </h2>
                <p className="muted break-words text-sm">
                  {r.property_name ||
                    r.property?.name ||
                    data?.properties.find((p) => p.id === r.property_id)
                      ?.name ||
                    tr("View property")}
                </p>
                {kind === "tenants" && r.phone && (
                  <p className="muted text-xs">
                    <bdi dir="ltr">{r.phone}</bdi>
                  </p>
                )}
                {kind === "tenants" && (
                  <p className="text-xs muted">
                    {day(r.contract_start_date)} — {day(r.contract_end_date)}
                  </p>
                )}
                {kind === "contracts" && (
                  <p className="text-xs muted">
                    {day(r.start_date)} — {day(r.end_date)} ·{" "}
                    {states[r.status] || tr(r.status)}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                <div>
                  <span className="muted block text-xs">
                    {tr("Monthly rent")}
                  </span>
                  <strong className="text-sm">{money(r.monthly_rent)}</strong>
                </div>
                <span className="text-xs font-bold text-emerald-700">
                  {tr("View details")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
      {open && (
        <Modal
          title={kind === "tenants" ? tr("Add tenant") : tr("Create contract")}
          onClose={() => setOpen(false)}
        >
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
            <label className="text-sm">
              {" "}
              {tr("Property")}{" "}
              <select
                className="field"
                required
                value={form.property_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    property_id: e.target.value,
                    tenant_id: "",
                    unit_id: "",
                  })
                }
              >
                <option value="">{tr("Select property")}</option>
                {data?.properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {kind === "contracts" && (
              <>
                <label className="text-sm">
                  {" "}
                  {tr("Tenant")}{" "}
                  <select
                    className="field"
                    required
                    value={form.tenant_id}
                    onChange={(e) =>
                      setForm({ ...form, tenant_id: e.target.value })
                    }
                  >
                    <option value="">{tr("Select tenant")}</option>
                    {data?.tenants
                      .filter((t) => String(t.property_id) === form.property_id)
                      .map((t) => (
                        <option value={t.id} key={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="text-sm">
                  {" "}
                  {tr("Unit")}{" "}
                  <select
                    className="field"
                    value={form.unit_id}
                    onChange={(e) =>
                      setForm({ ...form, unit_id: e.target.value })
                    }
                  >
                    <option value="">{tr("Link later")}</option>
                    {units.map((u) => (
                      <option value={u.id} key={u.id}>
                        {u.number} ·{" "}
                        {u.status === "occupied"
                          ? tr("Occupied")
                          : u.status === "maintenance"
                            ? tr("Maintenance")
                            : tr("Available")}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {fields.map(([key, label, type]) => (
              <label className="text-sm" key={key}>
                {label}
                <LocalizedInput
                  className="field"
                  required={[
                    "name",
                    "start_date",
                    "end_date",
                    "contract_start_date",
                    "contract_end_date",
                    "monthly_rent",
                  ].includes(key)}
                  type={type}
                  lang={["number", "tel"].includes(type) ? "en" : undefined}
                  min={type === "number" ? 0 : undefined}
                  step={type === "number" ? "0.01" : undefined}
                  value={form[key] || ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
            <div className="space-y-3 sm:col-span-2">
              <Notice message={failure} error />
              <button disabled={busy} className="btn btn-primary">
                {busy ? tr("Saving\u2026") : tr("Save record")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
export function TenantsPage() {
  useUiLanguage();
  return <List kind="tenants" />;
}
export function ContractsPage() {
  useUiLanguage();
  return <List kind="contracts" />;
}
