import { useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, ChevronDown, Globe, Moon, Palette, Sun } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { colorThemes } from "../../contexts/colorThemes";

export default function InterfacePreferences() {
  const { language, setLanguage, tr } = useLanguage();
  const { theme, setTheme, colorTheme, setColorTheme } = useTheme();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const choose = (apply: () => void) => {
    apply();
    close();
  };

  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    menu.current
      ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      ?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div
      className="relative"
      ref={root}
      onBlurCapture={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="btn"
        onClick={() => setOpen((current) => !current)}
        aria-label={tr("Customize interface")}
        title={tr("Customize interface")}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Palette size={18} aria-hidden="true" className="hidden sm:block" />
        <span className="sm:hidden">{tr("Customize")}</span>
        <span className="hidden sm:inline">{tr("Customize interface")}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label={tr("Customize interface")}
          className="preferences-dropdown panel"
          dir={language === "ar" ? "rtl" : "ltr"}
          onKeyDown={(event) => {
            if (event.key === "Tab") {
              setOpen(false);
              trigger.current?.focus();
              return;
            }
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="menuitemradio"]',
              ),
            );
            const index = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            let next: number;
            if (event.key === "ArrowDown") next = (index + 1) % items.length;
            else if (event.key === "ArrowUp")
              next = (index - 1 + items.length) % items.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = items.length - 1;
            else return;
            event.preventDefault();
            items[next]?.focus();
          }}
        >
          <div role="group" aria-label={tr("Language")}>
            <p className="preferences-label">
              <Globe size={15} aria-hidden="true" />
              {tr("Language")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                lang="ar"
                role="menuitemradio"
                aria-checked={language === "ar"}
                className="preferences-option"
                onClick={() => choose(() => setLanguage("ar"))}
              >
                العربية
                {language === "ar" && <Check size={15} aria-hidden="true" />}
              </button>
              <button
                type="button"
                lang="en"
                role="menuitemradio"
                aria-checked={language === "en"}
                className="preferences-option"
                onClick={() => choose(() => setLanguage("en"))}
              >
                English
                {language === "en" && <Check size={15} aria-hidden="true" />}
              </button>
            </div>
          </div>
          <div role="group" aria-label={tr("Appearance")}>
            <p className="preferences-label">{tr("Appearance")}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={theme === "light"}
                className="preferences-option"
                onClick={() => choose(() => setTheme("light"))}
              >
                <span className="flex items-center gap-2">
                  <Sun size={16} aria-hidden="true" />
                  {tr("Light")}
                </span>
                {theme === "light" && <Check size={15} aria-hidden="true" />}
              </button>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={theme === "dark"}
                className="preferences-option"
                onClick={() => choose(() => setTheme("dark"))}
              >
                <span className="flex items-center gap-2">
                  <Moon size={16} aria-hidden="true" />
                  {tr("Dark")}
                </span>
                {theme === "dark" && <Check size={15} aria-hidden="true" />}
              </button>
            </div>
          </div>
          <div role="group" aria-label={tr("Color theme")}>
            <p className="preferences-label">
              <Palette size={15} aria-hidden="true" />
              {tr("Color theme")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {colorThemes.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={colorTheme === preset.id}
                  className={`preferences-option ${preset.id === "wameed" && colorThemes.length % 2 === 1 ? "col-span-2" : ""}`}
                  onClick={() => choose(() => setColorTheme(preset.id))}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="preferences-swatches" aria-hidden="true">
                      <i style={{ background: preset.nav }} />
                      <i style={{ background: preset.highlight }} />
                    </span>
                    {tr(preset.name)}
                  </span>
                  {colorTheme === preset.id && (
                    <Check size={15} aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

