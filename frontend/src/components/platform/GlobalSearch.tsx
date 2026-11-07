import { useLanguage as useUiLanguage } from "../../contexts/LanguageContext";
import { tr } from "../../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, X } from "lucide-react";
import api from "../../services/api";
import { errorText } from "./UI";
const searchable = (q: string) =>
  q.trim().length >= 2 || /^[0-9٠-٩]+$/.test(q.trim());
type Hit = {
  id: number;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};
export default function GlobalSearch() {
  useUiLanguage();
  const [query, setQuery] = useState(""),
    [hits, setHits] = useState<Hit[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);
  useEffect(() => {
    if (!searchable(query)) {
      setHits([]);
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    setError("");
    const timer = setTimeout(() => {
      api
        .get<{
          items: Hit[];
        }>(`/api/real-estate/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        })
        .then((r) => {
          setHits(r.items);
          setBusy(false);
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setError(errorText(e));
            setBusy(false);
          }
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  return (
    <div ref={ref} className="global-search relative min-w-0 flex-1 w-full max-w-xl">
      <div className="relative">
        <span className="global-search-icon pointer-events-none absolute start-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg" aria-hidden="true">
          <Search className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <input
          aria-label={tr("Global search")}
          aria-expanded={open}
          aria-controls="global-search-results"
          autoComplete="off"
          placeholder={tr(
            "Search properties, tenants, contracts or units\u2026",
          )}
          value={query}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="field pe-10 ps-10"
        />
        {query && (
          <button
            aria-label={tr("Clear search")}
            onClick={() => {
              setQuery("");
              setHits([]);
            }}
            className="absolute end-1 top-1 flex h-9 w-9 items-center justify-center"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {open && searchable(query) && (
        <div
          id="global-search-results"
          className="panel search-results absolute inset-x-0 top-full z-50 mt-2 max-h-[60dvh] overflow-y-auto p-2"
          aria-label={tr("Search results")}
        >
          {busy ? (
            <p role="status" className="p-4 text-sm muted">
              {" "}
              {tr("Searching\u2026")}{" "}
            </p>
          ) : error ? (
            <p role="alert" className="p-4 text-sm text-red-600">
              {tr(error)}
            </p>
          ) : hits.length === 0 ? (
            <p className="p-4 text-sm muted">
              {" "}
              {tr("No matching results within your permitted records.")}{" "}
            </p>
          ) : (
            <>
              {[
                "Property",
                "Unit",
                "Tenant",
                "Contract",
                "Meter",
                "Expense",
                "Maintenance",
              ].map((type) => {
                const group = hits.filter((h) => h.type === type);
                return (
                  group.length > 0 && (
                    <section key={tr(type)}>
                      <h2 className="px-3 py-2 text-xs font-bold muted">
                        {tr(type)}
                      </h2>
                      {group.map((hit) => (
                        <Link
                          key={`${tr(type)}-${hit.id}`}
                          to={hit.href}
                          className="block rounded-xl p-3 hover:bg-emerald-500/10"
                        >
                          <span className="block text-sm font-bold break-words">
                            {hit.type === "Contract"
                              ? tr("Contract #") + hit.id
                              : hit.type === "Unit"
                                ? tr("Unit ") + hit.title.replace(/^Unit /, "")
                                : hit.title}
                          </span>
                          <span className="muted mt-1 block text-xs break-words">
                            {hit.type==='Meter'?tr(hit.subtitle):hit.type==='Maintenance'?tr(({open:'Open',in_progress:'In progress',completed:'Completed'} as Record<string,string>)[hit.subtitle]||hit.subtitle):hit.subtitle}
                          </span>
                        </Link>
                      ))}
                    </section>
                  )
                );
              })}
              <p className="muted p-3 text-xs">
                {" "}
                {tr(
                  "Up to 10 results per type. Refine your search to find other records.",
                )}{" "}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
