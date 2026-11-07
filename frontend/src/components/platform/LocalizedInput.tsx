import {
  ChangeEvent,
  InputHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { CalendarDays } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  dateDraftValue,
  timeDraftValue,
  formatDateValue,
  parseDateValue,
  validTimeValue,
} from "./dateValue";

type Props = InputHTMLAttributes<HTMLInputElement>;
export default function LocalizedInput(props: Props) {
  return props.type === "date" || props.type === "datetime-local" ? (
    <DateInput {...props} />
  ) : (
    <input {...props} />
  );
}
function DateInput({
  type,
  value = "",
  onChange,
  className = "field",
  min,
  max,
  required,
  disabled,
  readOnly,
  id,
  name,
  onBlur,
  ...rest
}: Props) {
  const { language } = useLanguage();
  const arabic = language === "ar";
  const datetime = type === "datetime-local";
  const current = String(value);
  const [date, setDate] = useState(() => formatDateValue(current.slice(0, 10)));
  const [time, setTime] = useState(() => current.slice(11, 16));
  const lastEmitted = useRef(current);
  const input = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = id || generatedId;
  useEffect(() => {
    if (current === lastEmitted.current) return;
    setDate(formatDateValue(current.slice(0, 10)));
    setTime(current.slice(11, 16));
    lastEmitted.current = current;
  }, [current]);
  const parsed = parseDateValue(date);
  const fullValue =
    parsed && (!datetime || validTimeValue(time))
      ? parsed + (datetime ? `T${time}` : "")
      : "";
  const invalid = Boolean((date || time) && !fullValue);
  const outsideRange = Boolean(
    fullValue &&
    ((min && fullValue < String(min)) || (max && fullValue > String(max))),
  );
  useEffect(() => {
    input.current?.setCustomValidity(
      invalid
        ? arabic
          ? "أدخل تاريخًا صحيحًا بترتيب يوم / شهر / سنة، وأكمل الوقت إن وُجد."
          : "Enter a valid day / month / year and complete the time if shown."
        : outsideRange
          ? arabic
            ? "التاريخ خارج الفترة المسموحة."
            : "The date is outside the allowed range."
          : "",
    );
  }, [invalid, outsideRange, arabic]);
  const emit = (
    nextDate: string,
    nextTime: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const validDate = parseDateValue(nextDate);
    const next =
      validDate && (!datetime || validTimeValue(nextTime))
        ? validDate + (datetime ? `T${nextTime}` : "")
        : "";
    lastEmitted.current = next;
    onChange?.({
      ...event,
      target: { ...event.target, value: next, name: name || "", id: inputId },
      currentTarget: { ...event.currentTarget, value: next },
    } as ChangeEvent<HTMLInputElement>);
  };
  return (
    <span
      className={`localized-date ${datetime ? "localized-date-time" : ""}`}
      lang={language}
      dir={arabic ? "rtl" : "ltr"}
    >
      <span className="localized-date-control">
        <input
          {...rest}
          ref={input}
          id={inputId}
          name={name}
          className={`${className} localized-date-text`}
          type="text"
          inputMode="numeric"
          dir="ltr"
          lang={language}
          placeholder={arabic ? "يوم / شهر / سنة" : "DD / MM / YYYY"}
          value={date}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(event) => {
            const nextDate = dateDraftValue(event.target.value, date);
            setDate(nextDate);
            emit(nextDate, time, event);
          }}
          onBlur={(event) => {
            if (parsed) setDate(formatDateValue(parsed));
            onBlur?.(event);
          }}
        />
        <span className="localized-date-picker" aria-hidden="true">
          <CalendarDays size={18} />
          <input
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            lang={language}
            value={parsed || ""}
            min={min ? String(min).slice(0, 10) : undefined}
            max={max ? String(max).slice(0, 10) : undefined}
            disabled={disabled || readOnly}
            onChange={(event) => {
              const nextDate = formatDateValue(event.target.value);
              setDate(nextDate);
              emit(nextDate, time, event);
              input.current?.focus();
            }}
          />
        </span>
      </span>
      {datetime && (
        <span className="localized-time-control">
          <span className="localized-time-label">
            {arabic ? "الوقت" : "Time"}
          </span>
          <input
            className={`${className} localized-time-text`}
            type="text"
            inputMode="numeric"
            dir="ltr"
            lang={language}
            aria-label={
              arabic ? "الوقت بنظام 24 ساعة" : "Time in 24-hour format"
            }
            placeholder="HH:MM"
            value={time}
            disabled={disabled}
            readOnly={readOnly}
            maxLength={5}
            onChange={(event) => {
              const next = timeDraftValue(event.target.value, time);
              setTime(next);
              emit(date, next, event);
            }}
          />
        </span>
      )}
    </span>
  );
}
