import { Globe } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
export function LanguageButton() {
  const { language, toggleLanguage, tr } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="btn shrink-0"
      aria-label={tr("Change language")}
      title={tr("Change language")}
    >
      <Globe size={17} />
      <span lang={language === "ar" ? "en" : "ar"}>
        {language === "ar" ? "English" : "العربية"}
      </span>
    </button>
  );
}
export function AuthLanguageControl() {
  const { pathname } = useLocation();
  return [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ].includes(pathname) ? (
    <div className="fixed end-4 top-4 z-50">
      <LanguageButton />
    </div>
  ) : null;
}
