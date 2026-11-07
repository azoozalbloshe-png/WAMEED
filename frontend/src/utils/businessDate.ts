/** Backend timestamps without offsets represent UTC; business days use Riyadh. */
export function apiDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value))
    return new Date(`${value}T00:00:00+03:00`);
  const normalized = value.replace(" ", "T");
  return new Date(
    /[zZ]$|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`,
  );
}
function businessParts(value: string) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(apiDate(value))
      .map((part) => [part.type, part.value]),
  );
}
export function businessDay(value: string): string {
  const p = businessParts(value);
  return `${p.year}-${p.month}-${p.day}`;
}
export function businessDateTimeInput(value: string): string {
  const p = businessParts(value);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function businessDateTimeIso(value: string): string {
  return new Date(`${value}+03:00`).toISOString();
}
