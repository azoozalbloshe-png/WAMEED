export function formatDateValue(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}
export function parseDateValue(value: string): string | null {
  const normalized = value
    .trim()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const match =
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(normalized) ||
    /^(\d{2})(\d{2})(\d{4})$/.exec(normalized);
  if (!match) return null;
  const [, d, m, y] = match;
  const date = new Date(0);
  date.setUTCFullYear(Number(y), Number(m) - 1, Number(d));
  if (
    Number(y) < 1 ||
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(m) - 1 ||
    date.getUTCDate() !== Number(d)
  )
    return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
export const validTimeValue = (value: string) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function dateDraftValue(raw: string, previous: string): string {
  const normalized = raw
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const parsed = parseDateValue(normalized);
  if (parsed) return formatDateValue(parsed);
  if (normalized.length < previous.length || !/^[\d/]*$/.test(normalized))
    return normalized;
  const digits = normalized.replace(/\//g, "");
  if (digits.length > 8) return normalized;
  return (
    digits.slice(0, 2) +
    (digits.length >= 2 ? "/" : "") +
    digits.slice(2, 4) +
    (digits.length >= 4 ? "/" : "") +
    digits.slice(4)
  );
}

export function timeDraftValue(raw: string, previous: string): string {
  const normalized = raw
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  if (normalized.length < previous.length || !/^[\d:]*$/.test(normalized))
    return normalized;
  const digits = normalized.replace(/:/g, "");
  if (digits.length > 4) return normalized;
  return digits.slice(0, 2) + (digits.length >= 2 ? ":" : "") + digits.slice(2);
}
