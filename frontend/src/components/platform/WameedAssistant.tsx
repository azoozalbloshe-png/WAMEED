import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  RotateCcw,
  ArrowUpLeft,
} from "lucide-react";
import api from "../../services/api";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";

type Topic = "overdue" | "expiring" | "finance" | "properties";
type Source = { label: string; href: string };
type Entry = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  mode?: string;
};
type Reply = { answer: string; sources: Source[]; mode: string };

export default function WameedAssistant() {
  const { user } = useAuth();
  return user ? <AssistantSession key={user.id} /> : null;
}

function AssistantSession() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const title = useId();
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController>();
  const busy = useRef(false);
  const words = (a: string, b: string) => (ar ? a : b);
  const prompts: { topic: Topic; label: string }[] = [
    {
      topic: "overdue",
      label: words("المتأخرات حتى اليوم", "Overdue rent as of today"),
    },
    {
      topic: "expiring",
      label: words(
        "عقود تنتهي خلال 30 يومًا",
        "Contracts expiring within 30 days",
      ),
    },
    {
      topic: "finance",
      label: words("ملخص مالية الشهر الحالي", "This month’s financial summary"),
    },
    {
      topic: "properties",
      label: words("عقاراتي غير المؤرشفة", "My non-archived properties"),
    },
  ];
  useEffect(
    () => () => {
      abort.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!open) return;
    let live = true;
    setMode("");
    setError("");
    api
      .get<{ mode: string }>("/api/assistant/status")
      .then((r) => {
        if (live) setMode(r.mode);
      })
      .catch(() => {
        if (live) setMode("unavailable");
      });
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key !== "Tab") return;
      const nodes = panel.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), a[href], textarea:not(:disabled)",
      );
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (!panel.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      live = false;
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", keyboard);
      trigger.current?.focus();
    };
  }, [open]);
  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [entries, pending, open]);

  async function send(message: string, topic?: Topic) {
    if (!message.trim() || busy.current) return;
    busy.current = true;
    setError("");
    setPending(message);
    setDraft("");
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await api.post<Reply>(
        "/api/assistant/chat",
        {
          message: message.trim(),
          language,
          topic,
          history: entries
            .slice(-8)
            .map((e) => ({ role: e.role, content: e.content.slice(0, 6000) })),
        },
        { signal: controller.signal, timeout: 70000 },
      );
      setMode(response.mode);
      setEntries((old) => [
        ...old,
        { role: "user", content: message },
        {
          role: "assistant",
          content: response.answer,
          sources: response.sources,
          mode: response.mode,
        },
      ]);
    } catch (e: any) {
      if (controller.signal.aborted) return;
      setDraft(message);
      const status = e?.response?.status;
      setError(
        status === 403
          ? words(
              "ما عندك صلاحية لقراءة هذه البيانات.",
              "You do not have permission to read these records.",
            )
          : status === 429
            ? words(
                "وصلت لحد الأسئلة المؤقت. جرّب بعد 15 دقيقة.",
                "Question limit reached. Try again in 15 minutes.",
              )
            : words(
                "تعذّر إكمال الطلب. سؤالك محفوظ في خانة الكتابة، حاول مرة ثانية.",
                "Unable to complete the request. Your question is in the text box; please try again.",
              ),
      );
    } finally {
      busy.current = false;
      setPending("");
    }
  }
  return (
    <div className="no-print">
      <button
        ref={trigger}
        type="button"
        className="wameed-assistant-launcher fixed bottom-5 end-5 z-40"
        aria-label={words("مساعد وميض", "Wameed assistant")}
        title={words("مساعد وميض", "Wameed assistant")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MessageCircle size={22} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title}
            dir={ar ? "rtl" : "ltr"}
            className="panel fixed bottom-0 end-0 z-[70] flex h-[min(720px,100dvh)] w-full flex-col overflow-hidden rounded-none shadow-2xl sm:bottom-5 sm:end-5 sm:h-[min(720px,calc(100dvh-40px))] sm:w-[420px] sm:rounded-2xl"
          >
            <header className="flex items-center gap-3 border-b p-4">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-nav)] text-white"
                aria-hidden="true"
              >
                <MessageCircle size={18} strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={title} className="font-bold">
                  {words("مساعد وميض", "Wameed assistant")}
                </h2>
                <p className="muted text-xs">
                  {mode === "ai"
                    ? words(
                        "يساعدك تفهم بيانات حسابك",
                        "Understand your account data",
                      )
                    : words(
                        "ملخصات مباشرة من بيانات حسابك",
                        "Direct summaries from your account",
                      )}
                </p>
              </div>
              <button
                type="button"
                className="btn px-2"
                onClick={() => setOpen(false)}
                aria-label={words("إغلاق المساعد", "Close assistant")}
              >
                <X size={20} />
              </button>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="rounded-xl border p-3 text-xs leading-6">
                {mode === "ai"
                  ? words(
                      "يستخدم المساعد خدمة OpenAI لفهم سؤالك والبيانات اللازمة للإجابة. راجع الأرقام من السجل الأصلي. لا ينفذ أي تعديل.",
                      "The assistant uses OpenAI to process your question and the records needed to answer. Verify figures in the original record. It cannot edit records.",
                    )
                  : mode === "unavailable"
                    ? words(
                        "تعذّر التحقق من حالة المساعد. حاول فتحه مجددًا.",
                        "Unable to check assistant status. Try reopening it.",
                      )
                    : words(
                        "هذه ملخصات بيانات محددة تعمل بدون خدمة ذكاء اصطناعي. اختر سؤالًا سريعًا. المحادثة الذكية المفتوحة تحتاج تفعيل الخدمة.",
                        "These fixed data summaries work without an AI service. Choose a quick question. Open-ended AI chat requires activation.",
                      )}
              </div>
              {!entries.length && (
                <p className="text-sm leading-7">
                  {words(
                    "هلا! وش تبي تراجع اليوم؟ أقدر أساعدك تتابع المتأخرات والعقود ومالية الشهر.",
                    "Hello! What would you like to review? Check overdue rent, contracts and this month’s finances.",
                  )}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {prompts.map((p) => (
                  <button
                    key={p.topic}
                    type="button"
                    className="btn rounded-xl px-3 py-2 text-xs"
                    disabled={!!pending || !mode || mode === "unavailable"}
                    onClick={() => send(p.label, p.topic)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div
                role="log"
                aria-live="polite"
                aria-label={words("المحادثة", "Conversation")}
                className="space-y-3"
              >
                {entries.map((e, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl border p-3 text-sm leading-7 ${e.role === "user" ? "ms-8 bg-[var(--brand-nav)] text-white" : "me-3"}`}
                  >
                    <p className="mb-1 text-xs font-bold opacity-70">
                      {e.role === "user"
                        ? words("أنت", "You")
                        : e.mode === "ai"
                          ? words("مساعد وميض", "Wameed assistant")
                          : words("ملخص مباشر", "Direct summary")}
                    </p>
                    <p className="whitespace-pre-wrap break-words" dir="auto">
                      {e.content}
                    </p>
                    {!!e.sources?.length && (
                      <div className="mt-3 space-y-1 border-t pt-2">
                        <p className="muted text-xs">
                          {words("السجلات المرتبطة", "Related records")}
                        </p>
                        {e.sources
                          .filter((s) =>
                            /^\/(contracts|properties)\/\d+$|^\/payments$/.test(
                              s.href,
                            ),
                          )
                          .map((s) => (
                            <Link
                              key={s.href}
                              to={s.href}
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-1 text-xs underline underline-offset-4"
                            >
                              <ArrowUpLeft size={14} />
                              {s.href === "/payments"
                                ? words(
                                    "التحصيلات والمصروفات",
                                    "Payments and expenses",
                                  )
                                : s.label}
                            </Link>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
                {!!pending && (
                  <div
                    role="status"
                    className="flex items-center gap-2 text-sm"
                  >
                    <Loader2 size={17} className="animate-spin" />
                    {words("أراجع بيانات حسابك…", "Checking your records…")}
                  </div>
                )}
              </div>
              {!!error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-300 p-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}
              <div ref={bottom} />
            </div>
            <form
              className="space-y-2 border-t p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
            >
              <label htmlFor={`${title}-question`} className="sr-only">
                {words(
                  "سؤالك لمساعد وميض",
                  "Your question for Wameed assistant",
                )}
              </label>
              {mode === "ai" && (
                <div className="flex items-end gap-2">
                  <textarea
                    id={`${title}-question`}
                    rows={2}
                    maxLength={1500}
                    value={draft}
                    disabled={!!pending}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={
                      mode === "ai"
                        ? words(
                            "اسأل عن بيانات حسابك…",
                            "Ask about your account…",
                          )
                        : words(
                            "اختر أحد الملخصات بالأعلى",
                            "Choose a summary above",
                          )
                    }
                    className="field min-w-0 flex-1 resize-none text-sm"
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        send(draft);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || !!pending}
                    className="btn btn-primary px-3 py-3"
                    aria-label={words("إرسال السؤال", "Send question")}
                  >
                    <Send size={18} />
                  </button>
                </div>
              )}
              <button
                type="button"
                disabled={!!pending || !entries.length}
                onClick={() => {
                  setEntries([]);
                  setError("");
                  setDraft("");
                }}
                className="muted flex items-center gap-1 text-xs disabled:opacity-40"
              >
                <RotateCcw size={12} />
                {words("محادثة جديدة", "New conversation")}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
