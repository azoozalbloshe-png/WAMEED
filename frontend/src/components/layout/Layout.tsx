import {
  CSSProperties,
  ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import BrandLogo from "../brand/BrandLogo";
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
  const [headerHeight, setHeaderHeight] = useState(69);
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
  const [expanded, setExpanded] = useState(false);
  const [mobilePath, setMobilePath] = useState<string | null>(null);
  const mobileOpen = mobilePath === location.pathname;
  const items = visibleGroups(can, user?.role);
  const signOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      className={`app-shell min-h-screen font-sans ${user ? "app-shell-authenticated" : ""}`}
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
            onClick={() => setMobilePath(mobileOpen ? null : location.pathname)}
            aria-label={tr(mobileOpen ? "Close menu" : "Open menu")}
            aria-expanded={mobileOpen}
            aria-controls="app-navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
        <Link
          to={user ? "/dashboard" : "/"}
          className={`flex shrink-0 items-center gap-2 ${user ? "md:hidden" : ""}`}
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
          <InterfacePreferences />
          {user ? (
            <button
              type="button"
              onClick={signOut}
              className="btn btn-danger px-3"
              aria-label={tr("Sign out")}
              title={tr("Sign out")}
            >
              <LogOut size={18} />
            </button>
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
                if (!event.currentTarget.contains(event.relatedTarget))
                  setExpanded(false);
              }}
              className={`app-sidebar no-print z-40 shrink-0 border-e border-white/10 bg-[var(--brand-nav)] text-white ${mobileOpen ? "fixed bottom-0 start-0 w-64 overflow-y-auto" : "hidden"} md:sticky md:flex md:flex-col md:overflow-y-auto md:pt-0 ${expanded ? "md:w-64" : "md:w-20"}`}
            >
              <div className="shrink-0 overflow-hidden border-b border-white/10 p-4">
                <Link
                  to="/dashboard"
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
                      className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-highlight)] ${isActive ? "bg-[color-mix(in_srgb,var(--brand-highlight)_20%,transparent)] font-bold text-[var(--brand-on-dark)]" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
                    >
                      <Icon size={20} className="shrink-0" />
                      <span
                        className={`whitespace-nowrap ${expanded || mobileOpen ? "" : "sr-only"}`}
                      >
                        {tr(label)}
                      </span>
                    </Link>
                  );
                })}
              </nav>
              <div className="flex items-center gap-3 border-t border-white/10 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-bold text-[var(--brand-on-dark)]">
                  {(user.full_name || user.username).slice(0, 1)}
                </span>
                {(expanded || mobileOpen) && (
                  <span className="min-w-0 truncate text-sm">
                    {user.full_name || user.username}
                  </span>
                )}
              </div>
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
    </div>
  );
}
