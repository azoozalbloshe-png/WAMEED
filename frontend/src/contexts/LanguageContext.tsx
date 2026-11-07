import {
  createContext,
  useContext,
  useLayoutEffect,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  Language,
  activateLanguage,
  currentLanguage,
  tr,
} from "../i18n/runtime";
interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  tr: typeof tr;
}
const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setSelected] = useState<Language>(currentLanguage);
  activateLanguage(language);
  const setLanguage = (next: Language) => {
    activateLanguage(next);
    setSelected(next);
  };
  useLayoutEffect(() => {
    localStorage.setItem("wameed-language", language);
    document.documentElement.lang = `${language}-SA-u-nu-latn`;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (
        event.key === "wameed-language" &&
        (event.newValue === "ar" || event.newValue === "en")
      )
        setLanguage(event.newValue);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage: () => setLanguage(language === "ar" ? "en" : "ar"),
        tr,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value)
    throw new Error("useLanguage must be used within a LanguageProvider");
  return value;
}
