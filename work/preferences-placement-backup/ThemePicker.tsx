import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { colorThemes } from "../../contexts/colorThemes";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ThemePicker() {
  const { theme, setTheme, colorTheme, setColorTheme } = useTheme();
  const { tr } = useLanguage();
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-3 text-sm font-bold">{tr("Color theme")}</legend>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {colorThemes.map((preset) => {
            const selected = colorTheme === preset.id;
            const surface = preset[theme];
            return (
              <label
                className={`theme-choice ${preset.id === "wameed" ? "col-span-2 sm:col-span-1" : ""}`}
                data-selected={selected}
                key={preset.id}
              >
                <input
                  type="radio"
                  name="color-theme"
                  value={preset.id}
                  checked={selected}
                  onChange={() => setColorTheme(preset.id)}
                  className="sr-only"
                />
                <span
                  className="theme-preview"
                  aria-hidden="true"
                  style={{
                    background: surface.bg,
                    borderColor: surface.border,
                  }}
                >
                  <span
                    className="theme-preview-bar"
                    style={{
                      background: surface.surface,
                      borderColor: surface.border,
                    }}
                  >
                    <span style={{ background: preset.highlight }} />
                    <span style={{ background: surface.border }} />
                  </span>
                  <span className="theme-preview-body">
                    <span
                      className="theme-preview-sidebar"
                      style={{ background: preset.nav }}
                    >
                      <i style={{ background: preset.highlight }} />
                      <i />
                      <i />
                    </span>
                    <span className="theme-preview-workspace">
                      <span style={{ background: preset.nav }} />
                      <span>
                        <i
                          style={{
                            background: surface.surface,
                            borderColor: surface.border,
                          }}
                        />
                        <i
                          style={{
                            background: surface.surface,
                            borderColor: surface.border,
                          }}
                        />
                      </span>
                    </span>
                  </span>
                </span>
                <span className="mt-3 flex items-center justify-between gap-2 text-sm font-bold">
                  <span>{tr(preset.name)}</span>
                  <span className="theme-choice-check" aria-hidden="true">
                    {selected && <Check size={14} />}
                  </span>
                </span>
                <span className="muted mt-1 block text-xs leading-6">
                  {tr(preset.description)}
                </span>
                {preset.id === "wameed" && (
                  <span className="theme-default mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold">
                    {tr("Original theme")}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm font-bold">{tr("Appearance")}</legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={theme === "light"}
            onClick={() => setTheme("light")}
            className={`btn ${theme === "light" ? "btn-primary" : ""}`}
          >
            <Sun size={18} />
            {tr("Light")}
          </button>
          <button
            type="button"
            aria-pressed={theme === "dark"}
            onClick={() => setTheme("dark")}
            className={`btn ${theme === "dark" ? "btn-primary" : ""}`}
          >
            <Moon size={18} />
            {tr("Dark")}
          </button>
        </div>
        <p className="muted mt-3 text-xs leading-6">
          {tr(
            "Choose a color theme and a light or dark appearance independently.",
          )}
        </p>
      </fieldset>
    </div>
  );
}
