import { useLanguage as useUiLanguage } from "../../contexts/LanguageContext";
import { tr } from "../../i18n/runtime";
import { ChangeEvent, useEffect, useState } from "react";
import { Paperclip, Upload, Download } from "lucide-react";
import api from "../../services/api";
import { base, download } from "../../services/platform";
import { Notice, errorText } from "./UI";
import { usePermissions } from "../../contexts/PermissionsContext";
type FileItem = {
  id: number;
  filename: string;
  content_type: string;
};
function Photo({ file }: { file: FileItem }) {
  useUiLanguage();
  const [url, setUrl] = useState("");
  useEffect(() => {
    let live = true,
      value = "";
    api
      .get<Blob>(`${base}/files/${file.id}`, { responseType: "blob" })
      .then((b) => {
        value = URL.createObjectURL(b);
        if (live) setUrl(value);
      })
      .catch(() => {});
    return () => {
      live = false;
      if (value) URL.revokeObjectURL(value);
    };
  }, [file.id]);
  return url ? (
    <img
      className="h-44 w-full rounded-xl object-cover"
      src={url}
      alt={file.filename}
    />
  ) : (
    <div className="flex h-44 items-center justify-center rounded-xl bg-gray-500/10 text-xs muted">
      {" "}
      {tr("Loading photo\u2026")}{" "}
    </div>
  );
}
export default function Attachments({
  resource,
  id,
  photos = false,
}: {
  resource: "properties" | "expenses" | "maintenance";
  id: number;
  photos?: boolean;
}) {
  useUiLanguage();
  const [files, setFiles] = useState<FileItem[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { can } = usePermissions();
  const writable = can(
    resource === "properties" ? "properties" : "expenses",
    "update",
  );
  const load = () =>
    api
      .get<FileItem[]>(`${base}/files/${resource}/${id}/list`)
      .then(setFiles)
      .catch((e) => setError(errorText(e)));
  useEffect(() => {
    void load();
  }, [resource, id]);
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(tr("Maximum file size: 5 MB"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      await api.post(`${base}/files/${resource}/${id}`, body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }
  async function save(file: FileItem) {
    try {
      const blob = await api.get<Blob>(`${base}/files/${file.id}`, {
        responseType: "blob",
      });
      download(blob, file.filename);
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Paperclip size={17} />
          {photos ? tr("Property photos") : tr("Invoices & attachments")}
        </h3>
        {writable && (
          <label
            className={`btn cursor-pointer text-xs ${busy ? "opacity-50" : ""}`}
          >
            <Upload size={15} />
            {busy
              ? tr("Uploading\u2026")
              : photos
                ? tr("Upload photo")
                : tr("Attach invoice")}
            <input
              aria-label={
                photos ? tr("Upload property photo") : tr("Attach invoice")
              }
              className="sr-only"
              type="file"
              accept={
                photos
                  ? "image/png,image/jpeg,image/webp"
                  : "image/png,image/jpeg,image/webp,application/pdf"
              }
              disabled={busy}
              onChange={upload}
            />
          </label>
        )}
      </div>
      <Notice message={error} error />
      {files.length === 0 ? (
        <p className="text-xs muted">
          {photos ? tr("No photos uploaded yet.") : tr("No attachments yet.")}
        </p>
      ) : (
        <div
          className={
            photos ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "space-y-2"
          }
        >
          {files.map((file) => (
            <div key={file.id} className="min-w-0 rounded-xl border p-2">
              {photos && <Photo file={file} />}
              <button
                className="mt-1 flex min-h-11 w-full items-center justify-between gap-2 px-2 text-start text-xs font-bold"
                onClick={() => void save(file)}
              >
                <span className="truncate">{file.filename}</span>
                <Download size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] muted">
        {" "}
        {tr("PNG, JPEG and WebP")} {!photos && tr(" and PDF")}{" "}
        {tr(
          "\u00B7 Up to 5 MB per file \u00B7 Attachments are private to your account.",
        )}{" "}
      </p>
    </section>
  );
}
