import { numberLocale } from "../../i18n/runtime";
import { dateLocale } from "../../i18n/runtime";
import { useLanguage as useUiLanguage } from "../../contexts/LanguageContext";
import { tr } from "../../i18n/runtime";
import {
  Component,
  ErrorInfo,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertCircle, Loader2, Search, X } from "lucide-react";
export const money = (n: number) =>
  "" +
  Number(n || 0).toLocaleString(numberLocale(), { maximumFractionDigits: 2 }) +
  tr(" SAR");
export const day = (v: string) =>
  new Date(v).toLocaleDateString(dateLocale(), {
    timeZone: "Asia/Riyadh",
  });
export function errorText(e: unknown) {
  const x = (e as any)?.response?.data?.detail;
  const status = (e as any)?.response?.status;
  if (status >= 500)
    return tr("The service is unavailable. Please try again later.");
  if (status === 404 && x === "Not Found")
    return tr(
      "This record or service is unavailable. Refresh the page and try again.",
    );
  return typeof x === "string"
    ? x
    : Array.isArray(x)
      ? tr("Check the required fields, dates and amounts.")
      : tr(
          "Unable to complete this action. Check your connection and try again.",
        );
}
export function useData<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    setData(null);
    load()
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(errorText(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [...deps, revision]);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  return { data, error, loading, refresh };
}
export function Loading() {
  useUiLanguage();
  return (
    <div role="status" className="panel flex items-center gap-3 p-7">
      <Loader2 className="h-5 w-5 animate-spin" />
      {tr("Loading your data\u2026")}{" "}
    </div>
  );
}
export function Notice({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  useUiLanguage();
  return message ? (
    <div
      role={error ? "alert" : "status"}
      className={`notice ${error ? "notice-error" : ""}`}
    >
      <AlertCircle className="h-5 w-5 shrink-0" />
      {tr(message)}
    </div>
  ) : null;
}
export function Empty({ children }: { children: ReactNode }) {
  useUiLanguage();
  return (
    <div className="panel empty-state">
      <Search className="mx-auto mb-3 h-8 w-8 opacity-40" />
      <p>{children}</p>
    </div>
  );
}
export function PageHead({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  useUiLanguage();
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black">{title}</h1>
        {description && (
          <p className="muted mt-2 text-sm leading-7">{description}</p>
        )}
      </div>
      {children}
    </header>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useUiLanguage();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const a = Array.from(
          document.querySelectorAll<HTMLElement>(
            "[data-modal] button,[data-modal] input,[data-modal] select,[data-modal] textarea,[data-modal] a",
          ),
        ).filter((x) => !x.hasAttribute("disabled"));
        const first = a[0],
          last = a[a.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", esc);
    document.querySelector<HTMLElement>("[data-modal] button")?.focus();
    return () => {
      document.removeEventListener("keydown", esc);
      old?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        data-modal
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="panel modal-content"
      >
        <header className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">{title}</h2>
          <button className="btn" aria-label={tr("Close")} onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export class PageBoundary extends Component<
  {
    children: ReactNode;
  },
  {
    failed: boolean;
  }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_e: Error, _info: ErrorInfo) {}
  render() {
    return this.state.failed ? (
      <div className="panel p-8">
        <h1 className="text-xl font-bold">
          {tr("Unable to display this page")}
        </h1>
        <p className="muted my-4">
          {" "}
          {tr("Your data is safe. Reload the page to try again.")}{" "}
        </p>
        <button className="btn btn-primary" onClick={() => location.reload()}>
          {" "}
          {tr("Reload")}{" "}
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
