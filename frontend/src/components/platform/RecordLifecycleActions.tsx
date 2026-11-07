import { useState } from "react";
import { Archive, RotateCcw, Trash2, MoreHorizontal } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { tr } from "../../i18n/runtime";
import api from "../../services/api";
import { Modal, Notice, errorText } from "./UI";
type Info = {
  archived: boolean;
  can_delete: boolean;
  parent_archived: boolean;
  links: { kind: string; count: number }[];
};
export default function RecordLifecycleActions({
  resource,
  id,
  name,
  archived,
  compact = false,
  onChanged,
  onDeleted,
}: {
  resource: "properties" | "units";
  id: number;
  name: string;
  archived?: boolean;
  compact?: boolean;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  useLanguage();
  const { can } = usePermissions();
  const [open, setOpen] = useState(false),
    [info, setInfo] = useState<Info | null>(null);
  const [action, setAction] = useState<"delete" | "archive" | "restore" | null>(
    null,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!can("properties", "delete")) return null;
  const path = `/api/real-estate/${resource}/${id}`;
  async function show() {
    setOpen(true);
    setInfo(null);
    setError("");
    setAction(null);
    try {
      setInfo(await api.get<Info>(`${path}/lifecycle`));
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function confirm() {
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      if (action === "delete") await api.delete(path);
      else await api.post(`${path}/${action}`);
      setOpen(false);
      if (action === "delete") onDeleted();
      else onChanged();
    } catch (e) {
      setError(errorText(e));
      setAction(null);
      try {
        setInfo(await api.get<Info>(`${path}/lifecycle`));
      } catch {}
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className={
          compact ? "property-more" : "btn inline-flex items-center gap-2"
        }
        aria-label={compact ? tr("Property actions") + " — " + name : undefined}
        title={compact ? tr("Property actions") : undefined}
        onClick={show}
      >
        {compact ? (
          <MoreHorizontal size={20} aria-hidden="true" />
        ) : (
          <>
            {archived ? <RotateCcw size={16} /> : <Archive size={16} />}
            {tr(archived ? "Manage archived record" : "Delete or archive")}
          </>
        )}
      </button>
      {open && (
        <Modal
          title={tr("Manage record")}
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <div className="space-y-4">
            <p className="break-words font-bold">{name}</p>
            <Notice message={error} error />
            {!info && !error && <p>{tr("Loading…")}</p>}
            {info && (
              <>
                <p className="text-sm leading-7">
                  {tr(
                    info.can_delete
                      ? "This record has no linked records. You can permanently delete it or archive it for later."
                      : "This record has linked records. Archive it to preserve contracts, payments and reports.",
                  )}
                </p>
                {!!info.links.length && (
                  <ul className="space-y-2 rounded-xl border p-3 text-sm">
                    {info.links.map((l) => (
                      <li key={l.kind} className="flex justify-between gap-4">
                        <span>{tr(l.kind)}</span>
                        <b>{l.count}</b>
                      </li>
                    ))}
                  </ul>
                )}
                {info.parent_archived && (
                  <p role="status" className="text-sm">
                    {tr("Restore the property before restoring this unit.")}
                  </p>
                )}
                {!action ? (
                  <div className="flex flex-wrap gap-3">
                    {info.archived ? (
                      <button
                        className="btn"
                        disabled={info.parent_archived}
                        onClick={() => setAction("restore")}
                      >
                        <RotateCcw size={16} />
                        {tr("Restore record")}
                      </button>
                    ) : (
                      <button
                        className="btn"
                        onClick={() => setAction("archive")}
                      >
                        <Archive size={16} />
                        {tr("Archive record")}
                      </button>
                    )}
                    {info.can_delete && (
                      <button
                        className="btn record-delete"
                        onClick={() => setAction("delete")}
                      >
                        <Trash2 size={16} />
                        {tr("Permanently delete")}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border p-4">
                    <p className="text-sm leading-7">
                      {tr(
                        action === "delete"
                          ? "Permanently delete this record? This cannot be undone."
                          : action === "archive"
                            ? "Archive this record? Its history stays available and you can restore it later."
                            : "Restore this record to the active list?",
                      )}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button className="btn" disabled={busy} onClick={confirm}>
                        {tr(
                          busy
                            ? "Saving…"
                            : action === "delete"
                              ? "Confirm deletion"
                              : action === "archive"
                                ? "Confirm archive"
                                : "Confirm restore",
                        )}
                      </button>
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() => setAction(null)}
                      >
                        {tr("Cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
