/** Shared approved logo with matching gold Arabic and English lettering. */
export default function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-logo flex items-center gap-3.5" dir="rtl">
      <span className="relative group shrink-0" aria-hidden="true">
        <span className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-2xl blur-md opacity-25 animate-pulse" />
        <span className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-teal-950 font-black shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-zap w-6 h-6 fill-teal-950 stroke-teal-950 stroke-[2.5]"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </span>
      </span>
      {!compact && (
        <span className="flex flex-col justify-center transition-opacity duration-300 whitespace-nowrap space-y-0.5">
          <span className="flex items-center gap-1.5">
            <span className="font-black text-lg tracking-tight text-amber-400 leading-none">
              وميض
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"
              aria-hidden="true"
            />
          </span>
          <span className="text-[11px] font-extrabold tracking-[0.18em] text-amber-400 uppercase leading-none">
            WAMEED
          </span>
        </span>
      )}
    </span>
  );
}
