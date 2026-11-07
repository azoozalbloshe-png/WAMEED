import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, X, RefreshCw, ArrowUpLeft } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { platform } from "../../services/platform";
import { useData, money, day } from "../platform/UI";
const followUp = new Set([
  "overdue",
  "due",
  "expiring",
  "renewal",
  "maintenance",
]);
type Alert = {
  id: string;
  title: string;
  description: string;
  type: string;
  href: string;
  date: string | null;
  amount: number | null;
};
export default function AlertsBell() {
  const { tr, language } = useLanguage();
  const { pathname } = useLocation();
  const { data, error, loading, refresh } = useData(platform.followUpAlerts, [
    pathname,
  ]);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const items: Alert[] = (data?.items || []).filter((a: Alert) =>
    followUp.has(a.type),
  );
  const count = items.length;
  const label =
    tr("Follow-up alerts") +
    (count ? ` (${count.toLocaleString(language)})` : "");
  const close = (focus = false) => {
    setOpen(false);
    if (focus) trigger.current?.focus();
  };
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  function toggle() {
    if (open) close();
    else {
      setOpen(true);
      refresh();
    }
  }
  return (
    <div
      ref={root}
      className="relative shrink-0"
      onBlurCapture={(e) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget))
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="alerts-bell btn relative inline-flex h-11 w-11 items-center justify-center p-0"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            refresh();
            requestAnimationFrame(() =>
              panel.current?.querySelector<HTMLElement>("button,a")?.focus(),
            );
          }
        }}
      >
        <Bell size={19} aria-hidden="true" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="alerts-bell-count absolute -end-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
          >
            {count > 99 ? "99+" : count.toLocaleString(language)}
          </span>
        )}
      </button>
      {open && (
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label={tr("Follow-up alerts")}
          className="alerts-dropdown panel z-[60] flex flex-col shadow-xl"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--wameed-border)] p-4">
            <div>
              <h2 className="font-black">{tr("Notifications")}</h2>
              <p className="muted mt-1 text-xs">
                {tr("Latest alerts needing follow-up")}
              </p>
            </div>
            <button
              type="button"
              className="btn h-10 w-10 p-0"
              aria-label={tr("Close notifications")}
              onClick={() => close(true)}
            >
              <X size={17} />
            </button>
          </header>
          <div
            className="min-h-0 overflow-y-auto overscroll-contain"
            aria-busy={loading}
          >
            {loading ? (
              <p role="status" className="muted p-5 text-sm">
                {tr("Loading…")}
              </p>
            ) : error ? (
              <div className="space-y-3 p-4">
                <p role="alert" className="text-sm">
                  {tr("Unable to load notifications.")}
                </p>
                <button type="button" className="btn" onClick={refresh}>
                  <RefreshCw size={15} />
                  {tr("Retry")}
                </button>
              </div>
            ) : items.length === 0 ? (
              <p className="muted p-5 text-sm leading-6">
                {tr("No alerts need follow-up right now.")}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--wameed-border)]">
                {items.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <Link
                      to={a.href}
                      onClick={() => close()}
                      className="block space-y-1 p-4 transition-colors hover:bg-emerald-500/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                    >
                      <h3
                        className={`text-sm font-bold ${a.type === "overdue" ? "text-red-600" : ""}`}
                      >
                        {tr(a.title)}
                      </h3>
                      <p className="muted break-words text-xs leading-5">
                        {tr(a.description)}
                      </p>
                      {(a.date || a.amount !== null) && (
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                          {a.date && (
                            <time dateTime={a.date} className="muted">
                              {day(a.date)}
                            </time>
                          )}
                          {a.amount !== null && (
                            <strong>{money(a.amount)}</strong>
                          )}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link
            to="/alerts"
            onClick={() => close()}
            className="flex min-h-12 shrink-0 items-center justify-center gap-2 border-t border-[var(--wameed-border)] p-3 text-sm font-bold text-emerald-700 hover:bg-emerald-500/5"
          >
            {tr("View all notifications")}
            <ArrowUpLeft
              size={16}
              className="ltr:rotate-90"
              aria-hidden="true"
            />
          </Link>
        </div>
      )}
    </div>
  );
}
