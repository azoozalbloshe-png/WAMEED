import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { Globe, Palette } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Modal } from "./UI";
import ThemePicker from "./ThemePicker";

export default function InterfacePreferences() {
  const { language, setLanguage, tr } = useLanguage();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() => setOpen(true)}
        aria-label={tr("Customize interface")}
        title={tr("Customize interface")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Palette size={18} aria-hidden="true" />
        <span className="sm:hidden">{tr("Customize")}</span>
        <span className="hidden sm:inline">{tr("Customize interface")}</span>
      </button>
      {open &&
        createPortal(
          <Modal
            className="interface-preferences-modal"
            title={tr("Customize interface")}
            onClose={() => setOpen(false)}
          >
            <div className="space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
              <p className="muted text-sm leading-7">
                {tr("Your language, colors and appearance, all in one place.")}
              </p>
              <fieldset>
                <legend className="mb-3 flex items-center gap-2 text-sm font-bold">
                  <Globe size={17} aria-hidden="true" />
                  {tr("Language")}
                </legend>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    lang="ar"
                    className={`btn flex-1 ${language === "ar" ? "btn-primary" : ""}`}
                    aria-pressed={language === "ar"}
                    onClick={() => setLanguage("ar")}
                  >
                    العربية
                  </button>
                  <button
                    type="button"
                    lang="en"
                    className={`btn flex-1 ${language === "en" ? "btn-primary" : ""}`}
                    aria-pressed={language === "en"}
                    onClick={() => setLanguage("en")}
                  >
                    English
                  </button>
                </div>
              </fieldset>
              <ThemePicker />
              <p className="muted text-xs leading-6" role="status">
                {tr(
                  "Changes are applied immediately and saved on this device.",
                )}
              </p>
            </div>
          </Modal>,
          document.body,
        )}
    </>
  );
}

export function AuthPreferencesControl() {
  const { pathname } = useLocation();
  return [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ].includes(pathname) ? (
    <div className="fixed end-4 top-4 z-50">
      <InterfacePreferences />
    </div>
  ) : null;
}
