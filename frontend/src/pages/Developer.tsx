import QuietSection from "../components/platform/QuietSection";
import BackupAdministration from "../components/platform/BackupAdministration";
import AddButton from "../components/platform/AddButton";
import { ShieldCheck as PageTitleIcon } from "lucide-react";
import PasswordInput from "../components/platform/PasswordInput";
import LocalizedInput from "../components/platform/LocalizedInput";
import { PageHead, Modal } from "../components/platform/UI";
import { useLanguage as useUiLanguage } from "../contexts/LanguageContext";
import { tr, direction } from "../i18n/runtime";
import { useEffect, useState } from "react";
import { Navigate, Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
type AccountUser = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  is_active: boolean;
  customer_account_id: number;
  created_at: string;
  last_login_at: string;
  property_count: number;
  unit_count: number;
  contract_count: number;
  subscription_tier: string;
  subscription_expires_at: string;
  can_delete: boolean;
  deletion_reason: string | null;
};
const roles: Record<string, string> = {
  get admin() {
    return tr("Workspace administrator");
  },
  get manager() {
    return tr("Administration staff");
  },
  get accountant() {
    return tr("Accountant");
  },
  get employee() {
    return tr("Follow-up staff");
  },
};
const names: Record<string, string> = {
  get username() {
    return tr("Username");
  },
  get email() {
    return tr("Email");
  },
  get full_name() {
    return tr("Full name");
  },
  get phone() {
    return tr("Phone");
  },
  get password() {
    return tr("Password");
  },
  get users() {
    return tr("Users");
  },
  get active_users() {
    return tr("Active users");
  },
  get accounts() {
    return tr("Customer accounts");
  },
  get properties() {
    return tr("Properties");
  },
  get contracts() {
    return tr("Contracts");
  },
  get tenants() {
    return tr("Tenants");
  },
  get payments() {
    return tr("Payments");
  },
  get expenses() {
    return tr("Expenses");
  },
  get meters() {
    return tr("Meters");
  },
  get dashboard() {
    return tr("Dashboard");
  },
};
const blank = {
  username: "",
  email: "",
  full_name: "",
  phone: "",
  password: "",
  role: "admin",
  customer_account_id: "",
};
const field = "w-full rounded-xl border p-3 bg-white text-slate-900";
const button =
  "rounded-xl bg-[var(--brand-nav)] px-4 py-2 text-white disabled:opacity-50";
export default function Developer() {
  useUiLanguage();
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<AccountUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [selected, setSelected] = useState<AccountUser | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [policies, setPolicies] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState(blank);
  const [integrations, setIntegrations] = useState<any>(null);
  const [annualTier, setAnnualTier] = useState("basic");
  const [annualEnd, setAnnualEnd] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  async function refresh() {
    const [u, s, l, p] = await Promise.all([
      api.get<AccountUser[]>("/api/admin/users"),
      api.get<Record<string, number>>("/api/admin/stats"),
      api.get<any[]>("/api/admin/audit"),
      api.get<Record<string, string[]>>("/api/admin/roles"),
    ]);
    setUsers(u);
    setStats(s);
    setLogs(l);
    setPolicies(p);
    setIntegrations(await api.get("/api/admin/integrations"));
  }
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      await refresh();
    } catch (e: any) {
      setMessage(
        typeof e?.response?.data?.detail === "string"
          ? e.response.data.detail
          : tr("Unable to complete this action. Check your details."),
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (user?.role === "super_admin") void run(refresh);
  }, [user?.role]);
  useEffect(() => {
    setSelected(null);
    setPassword("");
    if (id && user?.role === "super_admin")
      api
        .get<AccountUser>(`/api/admin/users/${id}`)
        .then(setSelected)
        .catch(() => setMessage(tr("Unable to load this user")));
  }, [id, user?.role]);
  if (user?.role !== "super_admin") return <Navigate to="/dashboard" replace />;
  return (
    <section
      dir={direction()}
      className="quiet-workspace mx-auto max-w-6xl space-y-6"
    >
      <PageHead icon={PageTitleIcon} title={tr("WAMEED administration")}>
        {!id && (
          <AddButton onClick={() => setCreating(true)}>
            {tr("Create account")}
          </AddButton>
        )}
      </PageHead>
      <QuietSection title={tr("Backups and recovery")}>
        <BackupAdministration />
      </QuietSection>
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 text-slate-900"
          >
            <h2
              id="delete-user-title"
              className="text-xl font-bold text-red-700"
            >
              {" "}
              {tr("Delete user")} {deleteTarget.username}
            </h2>
            <p>
              {" "}
              {tr(
                "This login account will be permanently deleted and all sessions revoked. This action cannot be undone in the app.",
              )}{" "}
            </p>
            <label className="block">
              {" "}
              {tr("Type the username to confirm:")}{" "}
              <strong>{deleteTarget.username}</strong>
              <input
                autoFocus
                autoComplete="off"
                className={field}
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
              />
            </label>
            <div className="flex gap-3">
              <button
                disabled={busy || deleteConfirmation !== deleteTarget.username}
                className="rounded-xl bg-red-700 px-4 py-3 text-white disabled:opacity-50"
                onClick={() =>
                  void run(async () => {
                    const target = deleteTarget;
                    await api.delete(`/api/admin/users/${target.id}`);
                    setDeleteTarget(null);
                    setDeleteConfirmation("");
                    setMessage("" + tr("Deleted user ") + target.username);
                    if (id === String(target.id)) {
                      setSelected(null);
                      navigate("/developer");
                    }
                  })
                }
              >
                {" "}
                {tr("Permanently delete user")}{" "}
              </button>
              <button
                disabled={busy}
                className="rounded-xl border px-4 py-3"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmation("");
                }}
              >
                {" "}
                {tr("Cancel")}{" "}
              </button>
            </div>
          </section>
        </div>
      )}
      {message && (
        <p role="status" className="rounded-xl border border-amber-400 p-4">
          {tr(message)}
        </p>
      )}
      {integrations && (
        <QuietSection title={tr("Service status")}>
          <p>
            {" "}
            {tr("Email:")}{" "}
            {integrations.email_configured
              ? tr("Configured")
              : tr("Not configured")}{" "}
            {tr("| Messaging:")}{" "}
            {integrations.phone_configured
              ? tr("Configured")
              : tr("Not configured")}{" "}
            {tr(
              "| Annual billing: payment provider and pricing not configured",
            )}{" "}
          </p>
          <p className="mt-2 text-sm">
            {" "}
            {tr("Password recovery: email")}{" "}
            {integrations.recovery?.email
              ? tr("Available")
              : tr("Not configured")}{" "}
            · SMS{" "}
            {integrations.recovery?.sms
              ? tr("Available")
              : tr("Not configured")}{" "}
            {tr("\u00B7 WhatsApp")}{" "}
            {integrations.recovery?.whatsapp
              ? tr("Available")
              : tr("Not configured")}
          </p>
        </QuietSection>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Object.entries(stats).map(([k, v]) => (
          <div key={k} className="panel p-4 text-sm">
            {names[k]}
            <strong className="block text-xl">{v}</strong>
          </div>
        ))}
      </div>
      {id ? (
        selected && (
          <section className="space-y-4 rounded-2xl border p-5">
            <Link to="/developer">{tr("Back to users")}</Link>
            <h2 className="text-xl font-bold">
              {tr("Details")} {selected.username}
            </h2>
            <p>
              {" "}
              {tr("Properties:")} {selected.property_count} {tr("| Units:")}{" "}
              {selected.unit_count} {tr("| Contracts:")}{" "}
              {selected.contract_count}
            </p>
            <p>
              {" "}
              {tr("Registered:")} {selected.created_at} {tr("| Last sign-in:")}{" "}
              {selected.last_login_at || tr("Never signed in")}
            </p>
            <p>
              {" "}
              {tr("Subscription:")} {selected.subscription_tier}{" "}
              {tr("| Expires:")}{" "}
              {selected.subscription_expires_at || tr("Not specified")}
            </p>
            {selected.role !== "super_admin" && (
              <>
                <form
                  className="space-y-3 rounded-xl border p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await api.put(`/api/admin/users/${id}/subscription`, {
                        subscription_tier: annualTier,
                        expires_at: new Date(annualEnd).toISOString(),
                      });
                      setSelected(
                        await api.get<AccountUser>(`/api/admin/users/${id}`),
                      );
                      setMessage(
                        tr(
                          "Subscription updated administratively. No payment was collected.",
                        ),
                      );
                    });
                  }}
                >
                  <h3 className="font-bold">{tr("Annual subscription")}</h3>
                  <p className="text-sm">
                    {" "}
                    {tr(
                      "Administrative subscription update for the customer's workspace. Automatic billing requires a payment provider.",
                    )}{" "}
                  </p>
                  <label>
                    {" "}
                    {tr("Plan")}{" "}
                    <input
                      required
                      className={field}
                      value={annualTier}
                      onChange={(e) => setAnnualTier(e.target.value)}
                    />
                  </label>
                  <label>
                    {" "}
                    {tr("Expiry date")}{" "}
                    <LocalizedInput
                      required
                      type="date"
                      className={field}
                      value={annualEnd}
                      onChange={(e) => setAnnualEnd(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className={button}
                    onClick={() => {
                      const next = new Date();
                      next.setFullYear(next.getFullYear() + 1);
                      setAnnualEnd(next.toISOString().slice(0, 10));
                    }}
                  >
                    {" "}
                    {tr("One year from today")}{" "}
                  </button>
                  <button disabled={busy} className={button}>
                    {" "}
                    {tr("Save subscription")}{" "}
                  </button>
                </form>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await api.put(`/api/admin/users/${id}`, selected);
                      setMessage(
                        tr(
                          "Changes saved and the user's previous sessions revoked",
                        ),
                      );
                    });
                  }}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {(["username", "email", "full_name", "phone"] as const).map(
                      (k) => (
                        <label key={k}>
                          {names[k]}
                          <input
                            className={field}
                            value={selected[k] || ""}
                            required={k === "username" || k === "email"}
                            type={k === "email" ? "email" : "text"}
                            onChange={(e) =>
                              setSelected({ ...selected, [k]: e.target.value })
                            }
                          />
                        </label>
                      ),
                    )}
                    <label>
                      {" "}
                      {tr("Role")}{" "}
                      <select
                        className={field}
                        value={selected.role}
                        onChange={(e) =>
                          setSelected({ ...selected, role: e.target.value })
                        }
                      >
                        {Object.entries(roles).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={selected.is_active}
                        onChange={(e) =>
                          setSelected({
                            ...selected,
                            is_active: e.target.checked,
                          })
                        }
                      />{" "}
                      {tr("Account active")}{" "}
                    </label>
                  </div>
                  <button disabled={busy} className={button}>
                    {" "}
                    {tr("Save")}{" "}
                  </button>
                </form>
                <form
                  className="flex gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await api.post(`/api/admin/users/${id}/password`, {
                        password,
                      });
                      setPassword("");
                      setMessage(tr("Password updated"));
                    });
                  }}
                >
                  <PasswordInput
                    aria-label={tr("New password")}
                    required
                    minLength={10}

                    className={field}
                    value={password}
                    placeholder={tr("New password (at least 10 characters)")}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button disabled={busy} className={button}>
                    {" "}
                    {tr("Set")}{" "}
                  </button>
                </form>
                <div className="flex gap-3">
                  <button
                    disabled={busy}
                    className={button}
                    onClick={() =>
                      void run(async () => {
                        const r = await api.post<{
                          message: string;
                        }>(`/api/admin/users/${id}/reset-link`);
                        setMessage(r.message);
                      })
                    }
                  >
                    {" "}
                    {tr("Send recovery link")}{" "}
                  </button>
                  <button
                    disabled={busy || !selected.can_delete}
                    title={selected.deletion_reason || tr("Delete user")}
                    className="rounded-xl border border-red-400 p-3 text-red-600 disabled:opacity-50"
                    onClick={() => {
                      setDeleteTarget(selected);
                      setDeleteConfirmation("");
                    }}
                  >
                    {" "}
                    {tr("Delete user")}{" "}
                  </button>
                  {selected.deletion_reason && (
                    <p className="text-sm text-amber-900">
                      {tr(selected.deletion_reason)}
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        )
      ) : (
        <>
          {creating && (
            <Modal
              title={tr("Create account")}
              onClose={() => {
                if (!busy) setCreating(false);
              }}
            >
              {" "}
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await api.post("/api/admin/users", {
                      ...form,
                      customer_account_id: form.customer_account_id
                        ? Number(form.customer_account_id)
                        : null,
                    });
                    setForm(blank);
                    setCreating(false);
                    setMessage(tr("User created"));
                  });
                }}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  {(
                    [
                      "username",
                      "email",
                      "full_name",
                      "phone",
                      "password",
                    ] as const
                  ).map((k) => (
                    <label key={k}>
                      {names[k]}
                      <input
                        className={field}
                        value={form[k]}
                        required={["username", "email", "password"].includes(k)}
                        minLength={
                          k === "password"
                            ? 10
                            : k === "username"
                              ? 3
                              : undefined
                        }
                        type={
                          k === "password"
                            ? "password"
                            : k === "email"
                              ? "email"
                              : "text"
                        }
                        onChange={(e) =>
                          setForm({ ...form, [k]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                  <label>
                    {" "}
                    {tr("Role")}{" "}
                    <select
                      className={field}
                      value={form.role}
                      onChange={(e) =>
                        setForm({ ...form, role: e.target.value })
                      }
                    >
                      {Object.entries(roles).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {" "}
                    {tr("Workspace")}{" "}
                    <select
                      className={field}
                      value={form.customer_account_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          customer_account_id: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        {tr("New customer \u2014 separate workspace")}
                      </option>
                      {Array.from(
                        new Map(
                          users.map((u) => [u.customer_account_id, u]),
                        ).values(),
                      ).map((u) => (
                        <option
                          key={u.customer_account_id}
                          value={u.customer_account_id}
                        >
                          {" "}
                          {tr("Workspace")} {u.customer_account_id} —{" "}
                          {u.username}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <AddButton type="submit" disabled={busy}>
                  {tr("Create account")}
                </AddButton>
              </form>
            </Modal>
          )}
          <section className="space-y-3 rounded-2xl border p-5">
            <h2 className="text-xl font-bold">{tr("Users")}</h2>
            <p className="text-sm opacity-75">
              {" "}
              {tr(
                "Legacy users can be deleted when they have no linked records or team members. Deletion revokes access immediately.",
              )}{" "}
            </p>
            <input
              aria-label={tr("Search users")}
              className={field}
              placeholder={tr("Search by name or email")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead>
                  <tr>
                    {[
                      tr("Name"),
                      tr("Email"),
                      tr("Role"),
                      tr("Status"),
                      tr("Actions"),
                    ].map((t) => (
                      <th className="p-3" key={t}>
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter((u) =>
                      `${u.username} ${u.email} ${u.full_name || ""}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((u) => (
                      <tr key={u.id} className="border-t">
                        <td data-label={tr("Name")} className="p-3">
                          {u.full_name || u.username}
                        </td>
                        <td data-label={tr("Email")}>{u.email}</td>
                        <td data-label={tr("Role")}>
                          {roles[u.role] ||
                            (u.role === "super_admin"
                              ? tr("Platform owner")
                              : tr("Legacy user"))}
                        </td>
                        <td data-label={tr("Status")}>
                          {u.is_active ? tr("Active") : tr("Suspended")}
                        </td>
                        <td data-label={tr("Actions")}>
                          <Link
                            to={`/developer/users/${u.id}`}
                            className="text-emerald-700 underline"
                          >
                            {" "}
                            {tr("View & edit")}{" "}
                          </Link>
                          {u.role !== "super_admin" && (
                            <QuietSection
                              title={tr("More actions")}
                              className="quiet-actions"
                            >
                              {" "}
                              {u.role !== "super_admin" && (
                                <button
                                  disabled={busy || !u.can_delete}
                                  title={u.deletion_reason || tr("Delete user")}
                                  onClick={() => {
                                    setDeleteTarget(u);
                                    setDeleteConfirmation("");
                                  }}
                                  className="ms-3 rounded-lg border border-red-300 px-3 py-1 text-red-700 disabled:opacity-50"
                                >
                                  {" "}
                                  {tr("Delete")}{" "}
                                </button>
                              )}
                              {u.deletion_reason &&
                                u.role !== "super_admin" && (
                                  <p className="mt-1 text-xs text-amber-900">
                                    {tr(u.deletion_reason)}
                                  </p>
                                )}
                            </QuietSection>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      <QuietSection title={tr("Role permissions")}>
        {Object.entries(policies).map(([role, permissions]) => (
          <div key={role} className="space-y-3 border-b pb-4">
            <h3>{roles[role]}</h3>
            <div className="flex flex-wrap gap-3">
              {[
                "properties",
                "tenants",
                "contracts",
                "payments",
                "expenses",
                "meters",
                "dashboard",
              ].flatMap((r) =>
                ["read", "create", "update", "delete"].map((a) => {
                  const key = `${r}:${a}`;
                  return (
                    <label key={key} className="rounded border p-2 text-sm">
                      <input
                        type="checkbox"
                        checked={
                          permissions.includes(key) ||
                          (a !== "read" && permissions.includes(`${r}:write`))
                        }
                        onChange={(e) => {
                          let next = [...permissions];
                          if (a !== "read" && next.includes(`${r}:write`)) {
                            next = next.filter((p) => p !== `${r}:write`);
                            next.push(
                              ...["create", "update", "delete"].map(
                                (action) => `${r}:${action}`,
                              ),
                            );
                          }
                          next = e.target.checked
                            ? [...new Set([...next, key])]
                            : next.filter((p) => p !== key);
                          setPolicies({ ...policies, [role]: next });
                        }}
                      />{" "}
                      {names[r]} —{" "}
                      {
                        (
                          {
                            get read() {
                              return tr("View");
                            },
                            get create() {
                              return tr("Add");
                            },
                            get update() {
                              return tr("Edit");
                            },
                            get delete() {
                              return tr("Delete / archive");
                            },
                          } as Record<string, string>
                        )[a]
                      }
                    </label>
                  );
                }),
              )}
            </div>
            <button
              disabled={busy}
              className={button}
              onClick={() =>
                void run(async () => {
                  await api.put(`/api/admin/roles/${role}`, { permissions });
                  setMessage(tr("Permissions saved"));
                })
              }
            >
              {" "}
              {tr("Save")} {roles[role]}
            </button>
          </div>
        ))}
      </QuietSection>
      <QuietSection title={tr("Administrative audit log")}>
        {!logs.length && <p>{tr("No activity yet")}</p>}
        {logs.map((l) => (
          <p key={l.id} className="border-t py-2 text-sm">
            {l.created_at} — {l.action} {tr("\u2014 Target")} {l.target_id}{" "}
            {tr("\u2014 Actor")} {l.actor_user_id}
          </p>
        ))}
      </QuietSection>
    </section>
  );
}
