import { useEffect, useState } from "react";
import { DatabaseBackup, RefreshCw, RotateCcw } from "lucide-react";
import api from "../../services/api";
import { tr, dateLocale } from "../../i18n/runtime";
import { useLanguage } from "../../contexts/LanguageContext";
import { Modal, Notice, errorText } from "./UI";
type Snapshot = {
  id: string;
  created_at: string;
  reason: string;
  verified: boolean;
  size: number;
};
type Status = {
  enabled: boolean;
  supported: boolean;
  interval_hours: number;
  retention_count: number;
  error: string | null;
  snapshots: Snapshot[];
  accounts: { id: number; name: string }[];
};
type Preview = {
  token: string;
  account_id: number;
  account_name: string;
  backup_at: string;
  current: Record<string, number>;
  saved: Record<string, number>;
};
const labels: Record<string, string> = {
  properties: "Properties",
  property_units: "Units",
  tenants: "Tenants",
  contracts: "Contracts",
  meters: "Meters",
  meter_readings: "Meter readings",
  rent_payments: "Collections",
  property_expenses: "Expenses",
  maintenance_requests: "Maintenance",
  record_attachments: "Attachments",
};
const timestamp = (value: string) =>
  new Date(value).toLocaleString(dateLocale(), { timeZone: "Asia/Riyadh" });
export default function BackupAdministration() {
  useLanguage();
  const [status, setStatus] = useState<Status | null>(null),
    [snapshot, setSnapshot] = useState(""),
    [account, setAccount] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null),
    [confirmation, setConfirmation] = useState(""),
    [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function refresh() {
    const data = await api.get<Status>("/api/admin/backups");
    setStatus(data);
    setSnapshot((previous) =>
      data.snapshots.some((s) => s.id === previous)
        ? previous
        : data.snapshots[0]?.id || "",
    );
  }
  useEffect(() => {
    void refresh().catch((e) => setError(errorText(e)));
  }, []);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function showPreview() {
    await run(async () => {
      const data = await api.post<Preview>(
        `/api/admin/backups/${snapshot}/preview`,
        { account_id: Number(account) },
      );
      setConfirmation("");
      setAccepted(false);
      setPreview(data);
    });
  }
  async function restore() {
    if (!preview) return;
    await run(async () => {
      await api.post(`/api/admin/backups/${snapshot}/restore`, {
        account_id: preview.account_id,
        token: preview.token,
        confirmation,
      });
      setPreview(null);
      setMessage(
        "Customer records restored. A safety backup was saved before recovery.",
      );
      await refresh();
    });
  }
  return (
    <section className="panel space-y-5 p-5">
      <h2 className="flex items-center gap-2 text-lg font-black">
        <DatabaseBackup size={22} />
        {tr("Backups and recovery")}
      </h2>
      <Notice message={tr(error)} error />
      <Notice message={tr(message)} />
      {!status ? (
        <button className="btn" disabled={busy} onClick={() => run(refresh)}>
          {tr("Refresh backup status")}
        </button>
      ) : (
        <>
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border p-3">
              <p className="muted">{tr("Automatic backups")}</p>
              <b>
                {tr(
                  !status.supported
                    ? "Unavailable"
                    : status.enabled
                      ? "Enabled"
                      : "Disabled",
                )}
              </b>
            </div>
            <div className="rounded-xl border p-3">
              <p className="muted">{tr("Backup interval")}</p>
              <b>
                {status.interval_hours} {tr("hours")}
              </b>
            </div>
            <div className="rounded-xl border p-3">
              <p className="muted">{tr("Retention")}</p>
              <b>
                {status.retention_count} {tr("backups")}
              </b>
            </div>
            <div className="rounded-xl border p-3">
              <p className="muted">{tr("Last successful backup")}</p>
              <b>
                {status.snapshots[0]
                  ? timestamp(status.snapshots[0].created_at)
                  : tr("No backups saved yet.")}
              </b>
            </div>
          </div>
          <p className="text-sm leading-7 muted">
            {tr(
              "Automatic backups run while the service is running. The latest saved copy is checked when it starts. Safety backups before recovery are retained separately.",
            )}
          </p>
          {status.error && (
            <Notice
              error
              message={tr(
                "The latest automatic backup failed. Check server storage and create a new backup.",
              )}
            />
          )}
          <div className="flex flex-wrap gap-3">
            <button
              className="btn btn-primary inline-flex items-center gap-2"
              disabled={busy || !status.supported}
              onClick={() =>
                run(async () => {
                  const created =
                    await api.post<Snapshot>("/api/admin/backups");
                  await refresh();
                  setSnapshot(created.id);
                  setMessage("A verified backup was saved successfully.");
                })
              }
            >
              <DatabaseBackup size={17} />
              {tr(busy ? "Working…" : "Create backup now")}
            </button>
            <button
              className="btn inline-flex items-center gap-2"
              disabled={busy}
              onClick={() => run(refresh)}
            >
              <RefreshCw size={17} />
              {tr("Refresh backup status")}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-bold">
              <span>{tr("Customer account to recover")}</span>
              <select
                className="field w-full"
                value={account}
                disabled={busy}
                onChange={(e) => {
                  setAccount(e.target.value);
                  setPreview(null);
                }}
              >
                <option value="">{tr("Select a customer account")}</option>
                {status.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (#{a.id})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-bold">
              <span>{tr("Saved backup")}</span>
              <select
                className="field w-full"
                value={snapshot}
                disabled={busy}
                onChange={(e) => {
                  setSnapshot(e.target.value);
                  setPreview(null);
                }}
              >
                <option value="">{tr("Select a backup")}</option>
                {status.snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {timestamp(s.created_at)} ·{" "}
                    {tr(
                      s.reason === "before_restore"
                        ? "Before recovery"
                        : s.reason === "automatic"
                          ? "Automatic"
                          : "Manual",
                    )}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!status.snapshots.length && (
            <p className="text-sm muted">{tr("No backups saved yet.")}</p>
          )}
          <p className="text-sm leading-7 muted">
            {tr(
              "Recovery replaces business records for the selected customer only. Other customers, login details, subscriptions and permissions stay as they are.",
            )}
          </p>
          <button
            className="btn inline-flex items-center gap-2"
            disabled={busy || !account || !snapshot || !status.supported}
            onClick={showPreview}
          >
            <RotateCcw size={17} />
            {tr("Preview recovery")}
          </button>
        </>
      )}
      {preview && (
        <Modal
          title={tr("Confirm customer data recovery")}
          onClose={() => {
            if (!busy) setPreview(null);
          }}
        >
          <div className="space-y-4">
            <p className="break-words font-bold">{preview.account_name}</p>
            <p className="text-sm">
              {tr("Saved backup")}: {timestamp(preview.backup_at)}
            </p>
            <p className="text-sm leading-7">
              {tr(
                "Records added or changed after this backup will be replaced. A new safety backup is required before recovery can start.",
              )}
            </p>
            <div
              role="table"
              aria-label={tr("Records")}
              className="rounded-xl border text-sm"
            >
              <div
                role="row"
                className="grid grid-cols-[minmax(0,1.5fr)_1fr_1fr] gap-2 border-b bg-black/5 p-2 font-bold"
              >
                <span role="columnheader">{tr("Records")}</span>
                <span role="columnheader" className="text-center">
                  {tr("Current")}
                </span>
                <span role="columnheader" className="text-center">
                  {tr("In backup")}
                </span>
              </div>
              {Object.keys(preview.saved).map((key) => (
                <div
                  role="row"
                  key={key}
                  className="grid grid-cols-[minmax(0,1.5fr)_1fr_1fr] gap-2 border-b p-2 last:border-b-0"
                >
                  <span role="cell">{tr(labels[key] || key)}</span>
                  <span role="cell" className="text-center">
                    {preview.current[key]}
                  </span>
                  <span role="cell" className="text-center">
                    {preview.saved[key]}
                  </span>
                </div>
              ))}
            </div>
            <Notice message={tr(error)} error />
            <label className="block space-y-2 text-sm font-bold">
              <span>{tr("Type the customer account name to confirm")}</span>
              <input
                className="field w-full"
                autoComplete="off"
                value={confirmation}
                disabled={busy}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
            <label className="flex items-start gap-2 text-sm leading-6">
              <input
                type="checkbox"
                className="mt-1"
                checked={accepted}
                disabled={busy}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>
                {tr(
                  "I understand that this replaces the selected customer’s business records with the saved copy.",
                )}
              </span>
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                className="btn btn-primary"
                disabled={
                  busy || !accepted || confirmation !== preview.account_name
                }
                onClick={restore}
              >
                {tr(busy ? "Restoring…" : "Confirm recovery")}
              </button>
              <button
                className="btn"
                disabled={busy}
                onClick={() => setPreview(null)}
              >
                {tr("Cancel")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
