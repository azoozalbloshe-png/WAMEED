import arabic from "./platform.ar.json";
export type Language = "ar" | "en";
const dictionary = arabic as Record<string, string>;
const english = Object.fromEntries(
  Object.entries(dictionary).map(([en, ar]) => [ar, en]),
);
let active: Language =
  localStorage.getItem("wameed-language") === "ar" ? "ar" : "en";
export const currentLanguage = () => active;
export const activateLanguage = (language: Language) => {
  active = language;
};
export const direction = () => (active === "ar" ? "rtl" : "ltr");
export const dateLocale = () => `${active}-SA-u-ca-gregory-nu-latn`;
export const numberLocale = () => `${active}-SA-u-nu-latn`;
export function tr(value: string): string {
  if (typeof value !== "string") return value;
  const canonical = english[value] || value;
  if (active === "en") return canonical;
  if (dictionary[canonical]) return dictionary[canonical];
  // API descriptions contain customer-entered names. Translate only the system-owned parts.
  if (/^Meter (.+) · No reading in the last 30 days$/.test(canonical))
    return canonical.replace(
      /^Meter (.+) · No reading in the last 30 days$/,
      "العداد $1 · لا توجد قراءة خلال آخر 30 يومًا",
    );
  if (
    /^Meter (.+) · Latest recorded bill; payment status is not tracked$/.test(
      canonical,
    )
  )
    return canonical.replace(
      /^Meter (.+) · Latest recorded bill; payment status is not tracked$/,
      "العداد $1 · آخر فاتورة مسجلة؛ حالة سدادها غير متتبعة",
    );
  if (/^Unit (.+) is vacant$/.test(canonical))
    return canonical.replace(/^Unit (.+) is vacant$/, "الوحدة $1 شاغرة");
  return canonical.replace(/ · Contract #(\d+)/g, " · عقد #$1");
}
