import {
  createContext,
  useContext,
  useState,
  useLayoutEffect,
  useEffect,
  ReactNode,
} from "react";
import {
  ColorThemeId,
  presetVariables,
  resolveColorTheme,
} from "./colorThemes";
type Theme = "light" | "dark";
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  colorTheme: ColorThemeId;
  setColorTheme: (theme: ColorThemeId) => void;
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const readPreference = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    readPreference("theme") === "dark" ? "dark" : "light",
  );
  const [colorTheme, setColorTheme] = useState<ColorThemeId>(
    () => resolveColorTheme(readPreference("wameed-color-theme")).id,
  );
  useLayoutEffect(() => {
    const root = document.documentElement;
    const preset = resolveColorTheme(colorTheme);
    if (colorTheme !== preset.id) setColorTheme(preset.id);
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    root.dataset.colorTheme = preset.id;
    Object.entries(presetVariables(preset, theme)).forEach(([key, value]) =>
      root.style.setProperty(key, value),
    );
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", preset.nav);
    try {
      localStorage.setItem("theme", theme);
      localStorage.setItem("wameed-color-theme", preset.id);
    } catch {
      /* The selected appearance still works when storage is unavailable. */
    }
  }, [theme, colorTheme]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === "theme")
        setTheme(event.newValue === "dark" ? "dark" : "light");
      if (event.key === "wameed-color-theme")
        setColorTheme(resolveColorTheme(event.newValue).id);
      if (event.key === null) {
        setTheme("light");
        setColorTheme("wameed");
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme: () =>
          setTheme((current) => (current === "light" ? "dark" : "light")),
        colorTheme,
        setColorTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
