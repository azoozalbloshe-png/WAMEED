import QuietSection, { FilterPanel } from "../components/platform/QuietSection";
import { businessDay, businessDateTimeIso } from "../utils/businessDate";
import AddButton from "../components/platform/AddButton";
import { Wallet as PageTitleIcon } from "lucide-react";
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
  Notice,
  PageHead,
  Modal,
  errorText,
  money,
  day,
  useData,
} from "../components/platform/UI";
import Attachments from "../components/platform/Attachments";
export default function PaymentsFinances() {
  useUiLanguage();
  const [query, setQuery] = useState("");
  const [params, setParams] = useSearchParams();
  const { can, loading: permissionsLoading } = usePermissions();
  const { data, error, loading, refresh } = useData(async () => {
    const [properties, contracts, payments, expenses] = await Promise.all([
      can("properties") ? realEstateService.getProperties() : [],
      can("contracts") ? realEstateService.getContracts() : [],
      can("payments") ? realEstateService.getPayments() : [],
      can("expenses") ? realEstateService.getExpenses() : [],
    ]);
    return { properties, contracts, payments, expenses };
  }, [permissionsLoading]);
  const [property, setProperty] = useState(params.get("property_id") || ""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [category, setCategory] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failure, setFailure] = useState(""),
    [tab, setTab] = useState(
      params.get("expense") || params.get("unit_id") ? "expenses" : "payments",
    ),
    [formOpen, setFormOpen] = useState(false),
    [units, setUnits] = useState<any[]>([]);
  const createRequested = params.get("action") === "create";
  const canCreatePayment = can("payments", "create");
  useEffect(() => {
    if (!createRequested || permissionsLoading || !canCreatePayment) return;
    setTab("payments");
    setFailure("");
    setFormOpen(true);
    const next = new URLSearchParams(params);
    next.delete("action");
    setParams(next, { replace: true });
  }, [
    createRequested,
    permissionsLoading,
    canCreatePayment,
    params,
    setParams,
  ]);
  const paymentBlank = {
    contract_id: params.get("contract_id") || "",
    amount: "",
    paid_at: "",
    method: "bank_transfer",
    transaction_code: "",
    notes: "",
  };
  const expenseBlank = {
    property_id: params.get("property_id") || "",
    unit_id: params.get("unit_id") || "",
    amount: "",
    category: "Maintenance",
    spent_at: "",
    description: "",
    invoice_reference: "",
  };
  const [payment, setPayment] = useState(paymentBlank),
    [expense, setExpense] = useState(expenseBlank);
  useEffect(() => {
    if (expense.property_id)
      platform
        .property(expense.property_id)
        .then((p) => setUnits(p.units))
        .catch(() => setUnits([]));
    else setUnits([]);
  }, [expense.property_id]);
  useEffect(() => {
    if (!loading && data && params.get("expense")) {
      document
        .getElementById(`expense-${params.get("expense")}`)
        ?.scrollIntoView({ block: "center" });
    }
  }, [data, loading, params]);
  const filterDate = (value: string) => {
    const d = businessDay(value);
    return (!from || d >= from) && (!to || d <= to);
  };
  const payments = (data?.payments || []).filter(
    (p) =>
      `${p.tenant_name} ${p.property_name} ${p.transaction_code || ""}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()) &&
      filterDate(p.paid_at) &&
      (!params.get("contract_id") ||
        String(p.contract_id) === params.get("contract_id")) &&
      (!property ||
        data?.contracts.find((c) => c.id === p.contract_id)?.property_id ===
          Number(property)),
  );
  const expenses = (data?.expenses || []).filter(
    (e) =>
      `${e.property_name} ${e.category} ${e.description || ""} ${e.invoice_reference || ""}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()) &&
      filterDate(e.spent_at) &&
      (!property || e.property_id === Number(property)) &&
      (!category || e.category === category) &&
      (!params.get("unit_id") ||
        String((e as any).unit_id) === params.get("unit_id")),
  );
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailure("");
    try {
      if (tab === "payments") {
        await realEstateService.createPayment({
          ...payment,
          contract_id: Number(payment.contract_id),
          amount: Number(payment.amount),
          paid_at: businessDateTimeIso(payment.paid_at),
          transaction_code: payment.transaction_code.trim() || null,
        });
        setPayment(paymentBlank);
      } else {
        await realEstateService.createExpense({
          ...expense,
          property_id: Number(expense.property_id),
          unit_id: expense.unit_id ? Number(expense.unit_id) : null,
          amount: Number(expense.amount),
          spent_at: businessDateTimeIso(expense.spent_at),
          invoice_reference: expense.invoice_reference.trim() || null,
        });
        setExpense(expenseBlank);
      }
      setMessage(
        tab === "payments"
          ? tr("Payment saved")
          : tr(
              "Expense saved. You can now attach its invoice below the record.",
            ),
      );
      setFormOpen(false);
      refresh();
    } catch (e) {
      setFailure(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const current = tab === "payments" ? payment : expense;
  function set(key: string, value: string) {
    if (tab === "payments") setPayment({ ...payment, [key]: value });
    else setExpense({ ...expense, [key]: value });
  }
  return (
    <section
      className="quiet-workspace mx-auto max-w-7xl space-y-5"
      dir={direction()}
    >
      <PageHead
        icon={PageTitleIcon}
        title={tr("Collections & expenses")}
        description={tr(
          "Actual financial records linked to your properties and contracts, with private invoice attachments.",
        )}
      >
        {can(tab, "create") && (
          <AddButton
            onClick={() => {
              setFailure("");
              setFormOpen(true);
            }}
          >
            {tr(tab === "payments" ? "Record payment" : "Record expense")}
          </AddButton>
        )}
      </PageHead>
      <Notice message={message} />
      <Notice message={error || failure} error />
      <nav
        className="flex flex-wrap gap-2"
        aria-label={tr("Financial section")}
      >
        {[
          ["payments", tr("Rent collections")],
          ["expenses", tr("Expenses & invoices")],
        ].map(([key, label]) => (
          <button
            className={`btn ${tab === key ? "btn-primary" : ""}`}
            key={key}
            aria-pressed={tab === key}
            onClick={() => {
              setTab(key);
              setFormOpen(false);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <FilterPanel
        search={
          <label className="text-xs font-bold">
            {tr("Search records")}
            <input
              className="field"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr("Name, property or reference")}
            />
          </label>
        }
        activeCount={
          Number(!!property) +
          Number(!!from) +
          Number(!!to) +
          Number(tab === "expenses" && !!category)
        }
        onClear={() => {
          setProperty("");
          setFrom("");
          setTo("");
          setCategory("");
        }}
      >
        {" "}
        <label className="text-xs">
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
        <label className="text-xs">
          {" "}
          {tr("From")}{" "}
          <LocalizedInput
            type="date"
            className="field"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-xs">
          {" "}
          {tr("To")}{" "}
          <LocalizedInput
            type="date"
            className="field"
            min={from}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        {tab === "expenses" && (
          <label className="text-xs">
            {" "}
            {tr("Category")}{" "}
            <select
              className="field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{tr("All categories")}</option>
              {Array.from(new Set(data?.expenses.map((e) => e.category))).map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ),
              )}
            </select>
          </label>
        )}
      </FilterPanel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          {" "}
          {tr("Filtered total:")}{" "}
          <strong>
            {money(
              (tab === "payments" ? payments : expenses).reduce(
                (sum, p) => sum + p.amount,
                0,
              ),
            )}
          </strong>
        </p>
        <Link
          className="min-h-11 inline-flex items-center text-sm font-bold muted"
          to="/reports"
        >
          {tr("Report center")}
        </Link>
      </div>
      {formOpen && (
        <Modal
          title={tr(
            tab === "payments"
              ? "Record rent payment"
              : "Record a property or unit expense",
          )}
          onClose={() => {
            if (!busy) setFormOpen(false);
          }}
        >
          <form className="space-y-4" onSubmit={save}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tab === "payments" ? (
                <label className="text-sm">
                  {" "}
                  {tr("Contract")}{" "}
                  <select
                    className="field"
                    required
                    value={payment.contract_id}
                    onChange={(e) => set("contract_id", e.target.value)}
                  >
                    <option value="">{tr("Select contract")}</option>
                    {data?.contracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} · {c.tenant_name} · {c.property_name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <label className="text-sm">
                    {" "}
                    {tr("Property")}{" "}
                    <select
                      className="field"
                      required
                      value={expense.property_id}
                      onChange={(e) =>
                        setExpense({
                          ...expense,
                          property_id: e.target.value,
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
                  <label className="text-sm">
                    {" "}
                    {tr("Unit (optional)")}{" "}
                    <select
                      className="field"
                      value={expense.unit_id}
                      onChange={(e) => set("unit_id", e.target.value)}
                    >
                      <option value="">{tr("Whole property")}</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.number}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {(tab === "payments"
                ? [
                    ["amount", tr("Amount"), "number"],
                    ["paid_at", tr("Payment date"), "datetime-local"],
                    [
                      "transaction_code",
                      tr("Transaction reference (optional)"),
                      "text",
                    ],
                    ["notes", tr("Notes"), "text"],
                  ]
                : [
                    ["amount", tr("Amount"), "number"],
                    ["spent_at", tr("Date"), "datetime-local"],
                    ["category", tr("Category"), "text"],
                    [
                      "invoice_reference",
                      tr("Invoice number (optional)"),
                      "text",
                    ],
                    ["description", tr("Description"), "text"],
                  ]
              ).map(([key, label, type]) => (
                <label className="text-sm" key={key}>
                  {label}
                  <LocalizedInput
                    className="field"
                    type={type}
                    lang={["number", "tel"].includes(type) ? "en" : undefined}
                    min={type === "number" ? "0.01" : undefined}
                    step={type === "number" ? "0.01" : undefined}
                    required={[
                      "amount",
                      "paid_at",
                      "spent_at",
                      "category",
                    ].includes(key)}
                    value={(current as any)[key]}
                    onChange={(e) => set(key, e.target.value)}
                  />
                </label>
              ))}
              {tab === "payments" && (
                <label className="text-sm">
                  {" "}
                  {tr("Payment method")}{" "}
                  <select
                    className="field"
                    value={payment.method}
                    onChange={(e) => set("method", e.target.value)}
                  >
                    <option value="bank_transfer">{tr("Bank transfer")}</option>
                    <option value="cash">{tr("Cash")}</option>
                    <option value="card">{tr("Card")}</option>
                    <option value="other">{tr("Other")}</option>
                  </select>
                </label>
              )}
            </div>
            <Notice message={failure} error />
            <button className="btn btn-primary" disabled={busy}>
              {busy ? tr("Saving\u2026") : tr("Save record")}
            </button>
          </form>
        </Modal>
      )}
      {loading || permissionsLoading ? (
        <Loading />
      ) : tab === "payments" ? (
        payments.length === 0 ? (
          <Empty>{tr("No matching payment records.")}</Empty>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <article key={p.id} className="panel space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      className="break-words font-black text-emerald-700"
                      to={`/contracts/${p.contract_id}`}
                    >
                      {p.tenant_name} · {tr("Contract #")}
                      {p.contract_id}
                    </Link>
                    <p className="muted mt-1 break-words text-xs">
                      {p.property_name}
                    </p>
                  </div>
                  <div className="text-sm">
                    <strong>{money(p.amount)}</strong>
                    <p className="muted mt-1 text-xs">{day(p.paid_at)}</p>
                  </div>
                </div>
                <QuietSection title={tr("Payment details")}>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="muted text-xs">{tr("Payment method")}</dt>
                      <dd>
                        {tr(
                          (
                            {
                              bank_transfer: "Bank transfer",
                              cash: "Cash",
                              card: "Card",
                              other: "Other",
                            } as Record<string, string>
                          )[p.method || ""] ||
                            p.method ||
                            "—",
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="muted text-xs">{tr("Reference")}</dt>
                      <dd className="break-words">
                        {p.transaction_code || "—"}
                      </dd>
                    </div>
                    {p.notes && (
                      <div className="sm:col-span-2">
                        <dt className="muted text-xs">{tr("Notes")}</dt>
                        <dd className="break-words">{p.notes}</dd>
                      </div>
                    )}
                  </dl>
                </QuietSection>
              </article>
            ))}
          </div>
        )
      ) : expenses.length === 0 ? (
        <Empty>{tr("No matching expenses.")}</Empty>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {expenses.map((e) => (
            <article
              key={e.id}
              id={`expense-${e.id}`}
              className={`panel space-y-4 p-5 ${params.get("expense") === String(e.id) ? "ring-2 ring-amber-400" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">{e.category}</h2>
                  <Link
                    className="mt-2 inline-block text-xs text-emerald-700 underline"
                    to={`/properties/${e.property_id}`}
                  >
                    {e.property_name}
                  </Link>
                </div>
                <strong>{money(e.amount)}</strong>
              </div>
              <p className="muted text-xs">
                {day(e.spent_at)} {tr("\u00B7 Invoice:")}{" "}
                {e.invoice_reference || tr("Not recorded")}
              </p>
              {e.description && (
                <p className="text-sm muted">{e.description}</p>
              )}
              {(e as any).unit_id && (
                <Link
                  to={`/units/${(e as any).unit_id}`}
                  className="text-sm underline"
                >
                  {" "}
                  {tr("Linked unit")}{" "}
                </Link>
              )}
              <QuietSection title={tr("Invoice attachments")}>
                <Attachments resource="expenses" id={e.id} />
              </QuietSection>
            </article>
          ))}
        </div>
      )}
      <QuietSection title={tr("Meter bills")}>
        <p className="muted my-3 text-sm">
          {" "}
          {tr(
            "View saved readings and bills for each meter in the Meters section.",
          )}{" "}
        </p>
        <Link className="btn" to="/calculation">
          {" "}
          {tr("Open meters & bills")}{" "}
        </Link>
      </QuietSection>
    </section>
  );
}
