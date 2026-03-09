import { useEffect, useMemo, useState } from "react";
import { EuroChatLogo } from "@/components/EuroChatLogo";

type ChatItem = {
  id: string;
  role: "user" | "assistant";
  message: string;
  time: string;
};

const conversation: ChatItem[] = [
  { id: "u1", role: "user", message: "Café 3€", time: "18:41" },
  { id: "a1", role: "assistant", message: "Gasto registrado", time: "18:41" },
  { id: "u2", role: "user", message: "Uber 12€", time: "18:42" },
  { id: "a2", role: "assistant", message: "Gasto registrado", time: "18:42" },
  { id: "a3", role: "assistant", message: "Hoy gastaste 15€", time: "18:43" },
  {
    id: "a4",
    role: "assistant",
    message: "Si mantienes este ritmo, gastarás aproximadamente 1.240€ este mes.",
    time: "18:44"
  },
  {
    id: "a5",
    role: "assistant",
    message: "⚠️ Podrías quedarte sin dinero el día 24.",
    time: "18:44"
  }
];

export function DemoChat() {
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [typingId, setTypingId] = useState<string | null>(null);

  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    const schedule = (index: number) => {
      if (index >= conversation.length) {
        return;
      }

      const current = conversation[index];

      if (current.role === "assistant") {
        setTypingId(current.id);

        const typingTimer = setTimeout(() => {
          setTypingId(null);
          setVisibleIds((prev) => [...prev, current.id]);

          const nextTimer = setTimeout(() => {
            schedule(index + 1);
          }, 260);

          timers.push(nextTimer);
        }, 680);

        timers.push(typingTimer);
        return;
      }

      setVisibleIds((prev) => [...prev, current.id]);
      const nextTimer = setTimeout(() => {
        schedule(index + 1);
      }, 360);

      timers.push(nextTimer);
    };

    schedule(0);

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const visibleSet = useMemo(() => new Set(visibleIds), [visibleIds]);

  return (
    <div className="mx-auto w-full max-w-[410px] rounded-[2.7rem] bg-[#0b1018] p-2.5 shadow-[0_24px_70px_rgba(2,6,23,0.6)]">
      <section className="overflow-hidden rounded-[2.2rem] border border-[#2a3444] bg-[#ece5dd]">
        <div className="flex h-8 items-center justify-center bg-[#111a23]">
          <div className="h-5 w-32 rounded-full bg-black/70" />
        </div>

        <header className="flex items-center gap-3 bg-[#075e54] px-3.5 py-2.5">
          <div className="rounded-full bg-white/20 p-1">
            <EuroChatLogo width={28} height={28} title="EuroChat AI avatar" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">EuroChat AI</p>
            <p className="text-[11px] text-emerald-100">en línea</p>
          </div>
        </header>

        <div className="space-y-2.5 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.42),transparent_33%),radial-gradient(circle_at_80%_65%,rgba(255,255,255,0.2),transparent_24%),linear-gradient(180deg,#efeae2_0%,#ece5dd_100%)] px-2.5 py-3">
          {conversation.map((item) => {
            const isUser = item.role === "user";
            const isVisible = visibleSet.has(item.id);
            const isTyping = typingId === item.id && item.role === "assistant";

            if (!isVisible && !isTyping) {
              return null;
            }

            return (
              <div key={item.id} className={`max-w-[83%] ${isUser ? "ml-auto" : ""}`}>
                {isTyping ? (
                  <div className="mb-1 inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-[10px] text-slate-500 shadow-sm animate-[bubbleIn_.2s_ease-out_both]">
                    EuroChat AI está escribiendo...
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-[typingDot_1s_ease-in-out_infinite] rounded-full bg-slate-400" />
                      <span className="h-1.5 w-1.5 animate-[typingDot_1s_ease-in-out_.15s_infinite] rounded-full bg-slate-400" />
                      <span className="h-1.5 w-1.5 animate-[typingDot_1s_ease-in-out_.3s_infinite] rounded-full bg-slate-400" />
                    </span>
                  </div>
                ) : null}

                {isVisible ? (
                  <article
                    className={`animate-[bubbleIn_.28s_ease-out_both] rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-sm ${
                      isUser ? "rounded-br-md bg-[#DCF8C6] text-[#1f3120]" : "rounded-tl-md bg-white text-slate-800"
                    }`}
                  >
                    <p>{item.message}</p>
                    <p className={`mt-1 text-right text-[10px] ${isUser ? "text-emerald-900/65" : "text-slate-500"}`}>{item.time}</p>
                  </article>
                ) : null}
              </div>
            );
          })}
        </div>

        <footer className="border-t border-[#d8d1c8] bg-[#f0f2f5] px-2.5 py-2">
          <div className="flex items-center gap-1.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-base text-slate-500 shadow-sm">😊</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-base text-slate-500 shadow-sm">＋</span>

            <div className="flex flex-1 items-center rounded-full bg-white px-3 py-2 shadow-sm">
              <span className="flex-1 text-left text-sm text-slate-400">Escribe un mensaje...</span>
              <span className="text-base text-slate-400">📎</span>
            </div>

            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#24c160] text-sm text-white">🎤</span>
          </div>
        </footer>
      </section>
    </div>
  );
}
