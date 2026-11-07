import { PageHead } from "../components/platform/UI";
import { useLanguage } from "../contexts/LanguageContext";
import { useLanguage as useUiLanguage } from "../contexts/LanguageContext";
import { tr, direction } from "../i18n/runtime";
import Verification from "./Verification";
import ThemePicker from "../components/platform/ThemePicker";
import { useAuth } from "../contexts/AuthContext";
export { TenantsPage, ContractsPage } from "./BusinessLists";
export { default as PaymentsPage } from "./PaymentsFinances";
export { default as ReportsPage } from "./ReportCenter";
export function SettingsPage() {
  const { language, setLanguage } = useLanguage();
  useUiLanguage();
  const { user } = useAuth();
  return (
    <section dir={direction()} className="mx-auto max-w-7xl space-y-5">
      <PageHead
        title={tr("Settings")}
        description={tr(
          "Display preferences for this device and your current account.",
        )}
      />
      <article className="panel space-y-6 p-4 sm:p-6">
        <h2 className="font-black">{tr("Display preferences")}</h2>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            {tr("Language")}
            <select
              className="field"
              value={language}
              onChange={(e) => setLanguage(e.target.value as "ar" | "en")}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
        <ThemePicker />
        <p className="text-xs text-gray-500">
          {" "}
          {tr("These preferences are saved on this device.")}{" "}
        </p>
      </article>
      <Verification />
      <article className="rounded-2xl bg-white p-6">
        <h2 className="font-black">{tr("Your account")}</h2>
        <p className="mt-3 text-sm">
          {" "}
          {tr("Username:")} {user?.username || tr("Not available")}
        </p>
        <p className="mt-1 text-sm">
          {tr("Email:")} {user?.email || tr("Not available")}
        </p>
        <p className="mt-3 text-xs text-gray-500">
          {" "}
          {tr("This page does not change user roles or permissions.")}{" "}
        </p>
      </article>
    </section>
  );
}
