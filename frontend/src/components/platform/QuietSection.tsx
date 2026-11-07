import { ReactNode, useId, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
export function FilterPanel({
  children,
  search,
  activeCount = 0,
  onClear,
  title = "Filters",
}: {
  children: ReactNode;
  search?: ReactNode;
  activeCount?: number;
  onClear?: () => void;
  title?: string;
}) {
  const { tr } = useLanguage();
  const [open, setOpen] = useState(activeCount > 0);
  const id = useId();
  return (
    <div className="panel quiet-filters no-print p-3 sm:p-4">
      <div className="flex flex-wrap items-end gap-3">
        {search && <div className="min-w-0 flex-1 basis-40">{search}</div>}
        <button
          type="button"
          className="btn shrink-0"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
          {tr(title)}
          {activeCount > 0 && (
            <span className="property-filter-count">{activeCount}</span>
          )}
        </button>
        {activeCount > 0 && onClear && (
          <button
            type="button"
            className="min-h-11 text-sm font-bold muted"
            onClick={onClear}
          >
            {tr("Clear filters")}
          </button>
        )}
      </div>
      <div
        id={id}
        hidden={!open}
        className="quiet-filter-body mt-4 border-t border-[var(--wameed-border)] pt-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      </div>
    </div>
  );
}
export default function QuietSection({
  title,
  children,
  initialOpen = false,
  className = "",
}: {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <details
      className={`panel quiet-section p-4 sm:p-5 ${className}`}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 font-bold">
        <span>{title}</span>
        <ChevronDown
          size={17}
          aria-hidden="true"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}
