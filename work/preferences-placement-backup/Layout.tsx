import {
  CSSProperties,
  ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  Home,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Settings,
  Shield,
  Sun,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import GlobalSearch from "../platform/GlobalSearch";
import { LanguageButton } from "../platform/LanguageButton";

const menuItems = [
  { path: "/dashboard", label: "Home", icon: Home, resource: "dashboard" },
  {
    path: "/properties",
    label: "Properties & units",
    icon: Building2,
    resource: "properties",
  },
  { path: "/tenants", label: "Tenants", icon: Users, resource: "tenants" },
  {
    path: "/contracts",
    label: "Contracts",
    icon: FileText,
    resource: "contracts",
  },
  {
    path: "/payments",
    label: "Collections & expenses",
    icon: CreditCard,
    resource: "payments",
  },
  {
    path: "/maintenance",
    label: "Maintenance",
    icon: Wrench,
    resource: "expenses",
  },
  {
    path: "/reports",
    label: "Reports",
    icon: BarChart3,
    resource: "dashboard",
  },
  {
    path: "/calculation",
    label: "Meter readings",
    icon: Zap,
    resource: "meters",
  },
  { path: "/settings", label: "Settings", icon: Settings, resource: "" },
  {
    path: "/developer",
    label: "Developer console",
    icon: Shield,
    resource: "admin",
  },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { language, tr } = useLanguage();
  const { theme, toggleTheme } = useTheme();
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
  const items = menuItems.filter((item) => {
    if (item.resource === "admin") return user?.role === "super_admin";
    if (!item.resource) return true;
    if (item.path === "/payments") return can("payments") || can("expenses");
    return can(item.resource);
  });
  const signOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      className="app-shell min-h-screen font-sans"
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
          className="flex shrink-0 items-center gap-2"
          aria-label="WAMEED"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-nav)] text-[var(--brand-highlight)]">
            <Zap size={23} />
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <strong className="text-lg">وميض</strong>
            <span className="text-[10px] font-bold tracking-[0.2em] muted">
              WAMEED
            </span>
          </span>
        </Link>
        {user && (
          <div className="order-last w-full md:order-none md:ms-4 md:w-auto md:min-w-0 md:flex-1">
            <GlobalSearch />
          </div>
        )}
        <div className="ms-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="btn px-3"
            onClick={toggleTheme}
            aria-label={tr(theme === "dark" ? "Light mode" : "Dark mode")}
            title={tr(theme === "dark" ? "Light mode" : "Dark mode")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <LanguageButton />
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

      <div className="flex items-stretch">
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
              <nav
                aria-label={tr("Main navigation")}
                className="flex-1 space-y-1.5 p-3"
              >
                {items.map(({ path, label, icon: Icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={() => setMobilePath(null)}
                    title={tr(label)}
                    aria-label={tr(label)}
                    className={({ isActive }) =>
                      `flex min-h-[48px] items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-highlight)] ${isActive ? "bg-[color-mix(in_srgb,var(--brand-highlight)_20%,transparent)] font-bold text-[var(--brand-on-dark)]" : "text-white/75 hover:bg-white/10 hover:text-white"}`
                    }
                  >
                    <Icon size={20} className="shrink-0" />
                    <span
                      className={`whitespace-nowrap ${expanded || mobileOpen ? "" : "sr-only"}`}
                    >
                      {tr(label)}
                    </span>
                  </NavLink>
                ))}
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
          {children}
        </main>
      </div>
    </div>
  );
}
