import QuietSection from "./QuietSection";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import api from "../../services/api";
import { download } from "../../services/platform";
import { tr } from "../../i18n/runtime";
import { useLanguage } from "../../contexts/LanguageContext";
import { errorText, Notice } from "./UI";
export default function CustomerDataExport({
  collapsible = false,
}: {
  collapsible?: boolean;
}) {
  useLanguage();
  const [allowed, setAllowed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    api
      .get<{ allowed: boolean }>("/api/account/data-export/status")
      .then((r) => {
        if (active) setAllowed(r.allowed);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (!allowed) return null;
  async function exportData() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const blob = await api.get<Blob>("/api/account/data-export", {
        responseType: "blob",
      });
      download(
        blob,
        `wameed-data-${new Date().toISOString().slice(0, 10)}.zip`,
      );
      setMessage(
        "Your data export is ready. Keep the downloaded file private.",
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const content = (
    <article className="panel space-y-4 p-5">
      <h2 className="font-black">{tr("Export your account data")}</h2>
      <p className="text-sm leading-7 muted">
        {tr(
          "Download your properties, units, tenants, contracts, payments, expenses, meters, maintenance and attachments, including archived records. Only the account owner can export this data.",
        )}
      </p>
      <p className="text-sm leading-7 muted">
        {tr(
          "Recovery is handled by WAMEED administration from managed backups. Contact administration if you need to recover your records.",
        )}
      </p>
      <Notice message={tr(error)} error />
      <Notice message={tr(message)} />
      <button
        type="button"
        className="btn btn-primary inline-flex items-center gap-2"
        disabled={busy}
        onClick={exportData}
      >
        <Download size={18} />
        {tr(busy ? "Preparing export…" : "Download my data")}
      </button>
    </article>
  );
  return collapsible ? (
    <QuietSection
      title={tr("Export your account data")}
      className="quiet-embedded"
    >
      {content}
    </QuietSection>
  ) : (
    content
  );
}
