import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { visibleGroups, matchesPath } from "./workspaceNavigation";
export default function SectionTabs() {
  const { tr, language } = useLanguage();
  const navRef = useRef<HTMLElement>(null);
  const { user } = useAuth();
  const { can } = usePermissions();
  const { pathname } = useLocation();
  const group = visibleGroups(can, user?.role).find((g) =>
    g.matches.some((path) => matchesPath(pathname, path)),
  );
  useEffect(() => {
    navRef.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname, group?.id, language]);
  if (!group || !["properties", "leasing", "finance"].includes(group.id))
    return null;
  return (
    <nav
      ref={navRef}
      aria-label={tr("Section navigation")}
      className="workspace-tabs mb-5 flex gap-2 rounded-2xl border border-[var(--wameed-border)] bg-[var(--wameed-surface)] p-2"
    >
      {group.tabs.map(({ path, label, icon: Icon }) => {
        const active =
          matchesPath(pathname, path) ||
          (path === "/properties" && matchesPath(pathname, "/units"));
        return (
          <Link
            key={path}
            to={path}
            aria-current={active ? "page" : undefined}
            className={`workspace-tab inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${active ? "workspace-tab-active" : "muted hover:bg-emerald-500/5"}`}
          >
            <Icon size={17} aria-hidden="true" />
            {tr(label)}
          </Link>
        );
      })}
    </nav>
  );
}
