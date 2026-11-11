import { useLanguage as useUiLanguage } from "../contexts/LanguageContext";
import { tr } from "../i18n/runtime";
import { useLanguage } from "../contexts/LanguageContext";
export default function Home() {
  useUiLanguage();
  const { language } = useLanguage();
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <div className="relative overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--brand-nav)_10%,transparent)] bg-gradient-to-br from-[var(--brand-nav)] to-[var(--brand-glow)] p-8 text-white shadow-xl sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-12 -bottom-20 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--brand-highlight)_15%,transparent)] blur-3xl"
        />
        <div className="relative">
          <h1 className="mb-4 text-3xl font-bold text-[var(--brand-on-dark)]">
            {language === "ar"
              ? tr("Welcome to WAMEED")
              : tr("Welcome to WAMEED")}
          </h1>
          <p className="mb-6 text-lg text-white/75">
            {language === "ar"
              ? tr(
                  "Everything Under Control. Manage your properties and meters with confidence.",
                )
              : "Everything is under control for efficient property and meter management."}
          </p>
        </div>
      </div>
    </div>
  );
}
