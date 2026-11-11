
import {
  CSSProperties,
  ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LogIn,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import BrandLogo from "../brand/BrandLogo";
import WameedAssistant from "../platform/WameedAssistant";
import GlobalSearch from "../platform/GlobalSearch";
import InterfacePreferences from "../platform/InterfacePreferences";
import SectionTabs from "./SectionTabs";
import AlertsBell from "./AlertsBell";
import { visibleGroups, matchesPath } from "./workspaceNavigation";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { language, tr } = useLanguage();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  const headerRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const accountMenuId = useId();

  const [headerHeight, setHeaderHeight] = useState(69);
  const [expanded, setExpanded] = useState(false);
  const [mobilePath, setMobilePath] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  const mobileOpen = mobilePath === location.pathname;
  const items = visibleGroups(can);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const measure = () =>
      setHeaderHeight(header.getBoundingClientRect().height);

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(header);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!accountOpen) return;

    const outside = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        accountTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [accountOpen]);

  const signOut = () => {
    setAccountOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <div
      className={`app-shell min-h-screen font-sans ${
        user ? "app-shell-authenticated" : ""
      }`}
      style={{ "--app-header-height": `${headerHeight}px` } as CSSProperties}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <a href="#main-content" className="skip-link">
        {tr("Skip to content")}
      </a>

      <header
        ref={headerRef}
        className="app-topbar sticky top-0 z-50 flex flex-wrap items-center gap-3 border-b px-3 py-3 sm:px-6"
      >
        {user && (
          <button
            type="button"
            className="btn px-3 md:hidden"
            onClick={() =>
              setMobilePath(mobileOpen ? null : location.pathname)
            }
            aria-label={tr(mobileOpen ? "Close menu" : "Open menu")}
            aria-expanded={mobileOpen}
            aria-controls="app-navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        <Link
          to="/"
          className={`flex shrink-0 items-center gap-2 ${
            user ? "md:hidden" : ""
          }`}
          aria-label={language === "ar" ? "وميض — الرئيسية" : "WAMEED — Home"}
        >
          <BrandLogo />
        </Link>

        {user && (
          <div className="order-last w-full md:order-none md:ms-4 md:w-auto md:min-w-0 md:flex-1">
            <GlobalSearch />
          </div>
        )}

        <div className="ms-auto flex shrink-0 items-center gap-2">
          {user && can("dashboard") && <AlertsBell />}

          {user ? (
            <div className="relative" ref={accountRef}>
              <button
                ref={accountTriggerRef}
                type="button"
                onClick={() => setAccountOpen((current) => !current)}
                className="btn flex items-center gap-2 px-2 sm:px-3"
                aria-label={tr("Account")}
                aria-haspopup="true"
                aria-expanded={accountOpen}
                aria-controls={accountOpen ? accountMenuId : undefined}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-nav)] text-sm font-bold text-white">
                  {(user.full_name || user.username).slice(0, 1).toUpperCase()}
                </span>

                <span className="hidden max-w-36 truncate text-sm font-bold sm:block">
                  {user.full_name || user.username}
                </span>

                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    accountOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {accountOpen && (
                <div
                  id={accountMenuId}
                  className="panel absolute end-0 top-full z-[60] mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-visible rounded-2xl border border-[var(--wameed-border)] p-3 shadow-xl"
                  dir={language === "ar" ? "rtl" : "ltr"}
                >
                  <div className="flex items-center gap-3 border-b border-[var(--wameed-border)] px-2 pb-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand-nav)] text-lg font-bold text-white">
                      {(user.full_name || user.username)
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {user.full_name || user.username}
                      </p>
                      <p className="truncate text-xs muted" dir="ltr">
                        {user.email}
                      </p>
                      <p className="mt-1 text-xs muted">
                        {tr(user.role)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 border-b border-[var(--wameed-border)] py-3">
                    <p className="px-2 text-xs font-bold muted">
                      {tr("Customize interface")}
                    </p>
                    <InterfacePreferences />
                  </div>

                  <div className="space-y-1 py-2">
                    <Link
                      to="/settings"
                      onClick={() => setAccountOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-emerald-500/10"
                    >
                      <Settings size={18} />
                      {tr("Account settings")}
                    </Link>

                    {user.role === "super_admin" && (
                      <Link
                        to="/developer"
                        onClick={() => setAccountOpen(false)}
                        className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-emerald-500/10"
                      >
                        <ShieldCheck size={18} />
                        {tr("Developer console")}
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-[var(--wameed-border)] pt-2">
                    <button
                      type="button"
                      onClick={signOut}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-500/10"
                    >
                      <LogOut size={18} />
                      {tr("Sign out")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary">
              <LogIn size={18} />
              <span className="hidden sm:inline">{tr("Sign in")}</span>
            </Link>
          )}
        </div>
      </header>

      <div className="app-workspace flex items-stretch">
        {user && (
          <>
            {mobileOpen && (
              <button
                type="button"
                className="fixed inset-0 z-30 bg-black/40 md:hidden"
                onClick={() => setMobilePath(null)}
                aria-label={tr("Close menu")}
              />
            )}

            <aside
              id="app-navigation"
              onMouseEnter={() => setExpanded(true)}
              onMouseLeave={() => setExpanded(false)}
              onFocusCapture={() => setExpanded(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setExpanded(false);
                }
              }}
              className={`app-sidebar no-print z-40 shrink-0 border-e border-white/10 bg-[var(--brand-nav)] text-white ${
                mobileOpen
                  ? "fixed bottom-0 start-0 w-64 overflow-y-auto"
                  : "hidden"
              } md:sticky md:flex md:flex-col md:overflow-y-auto md:pt-0 ${
                expanded ? "md:w-64" : "md:w-20"
              }`}
            >
              <div className="shrink-0 overflow-hidden border-b border-white/10 p-4">
                <Link
                  to="/"
                  className="flex w-fit rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-highlight)]"
                  aria-label={
                    language === "ar" ? "وميض — الرئيسية" : "WAMEED — Home"
                  }
                  onClick={() => setMobilePath(null)}
                >
                  <BrandLogo compact={!expanded && !mobileOpen} />
                </Link>
              </div>

              <nav
                aria-label={tr("Main navigation")}
                className="flex-1 space-y-1.5 p-3"
              >
                {items.map(({ id, tabs, matches, label, icon: Icon }) => {
                  const path = tabs[0].path;
                  const isActive = matches.some((prefix) =>
                    matchesPath(location.pathname, prefix),
                  );

                  return (
                    <Link
                      key={id}
                      to={path}
                      onClick={() => setMobilePath(null)}
                      title={tr(label)}
                      aria-label={tr(label)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-highlight)] ${
                        isActive
                          ? "bg-[color-mix(in_srgb,var(--brand-highlight)_20%,transparent)] font-bold text-[var(--brand-on-dark)]"
                          : "text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon size={20} className="shrink-0" />
                      <span
                        className={`whitespace-nowrap ${
                          expanded || mobileOpen ? "" : "sr-only"
                        }`}
                      >
                        {tr(label)}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </>
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className="app-main min-w-0 flex-1 p-4 sm:p-6 lg:p-8"
        >
          {user && <SectionTabs />}
          {children}
        </main>
      </div>

      <WameedAssistant />
    </div>
  );
}
