import QuietSection from "../components/platform/QuietSection";
import CustomerDataExport from "../components/platform/CustomerDataExport";
import { Settings as PageTitleIcon } from "lucide-react";
import { PageHead } from "../components/platform/UI";
import { useLanguage as useUiLanguage } from "../contexts/LanguageContext";
import { tr, direction } from "../i18n/runtime";
import Verification from "./Verification";
import { useAuth } from "../contexts/AuthContext";
export { TenantsPage, ContractsPage } from "./BusinessLists";
export { default as PaymentsPage } from "./PaymentsFinances";
export { default as ReportsPage } from "./ReportCenter";
export function SettingsPage() {
  useUiLanguage();
  const { user } = useAuth();
  return (
    <section
      dir={direction()}
      className="quiet-workspace mx-auto max-w-7xl space-y-5"
    >
      <PageHead
        icon={PageTitleIcon}
        title={tr("Settings")}
        description={tr("Account details, email and phone verification.")}
      />

      <article className="quiet-account panel min-w-0 p-5">
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
      <QuietSection
        title={tr("Email & phone verification")}
        className="quiet-embedded"
      >
        <Verification />
      </QuietSection>
      <CustomerDataExport collapsible />
    </section>
  );
}
