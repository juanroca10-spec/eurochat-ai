import { EuroChatLogo } from "@/components/EuroChatLogo";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  accent?: "prediction" | "alert";
};

const conversation: Message[] = [
  {
    id: "u-1",
    role: "user",
    text: "Hoy gasté 24€ en supermercado, 18€ en taxi y 35€ en cena.",
    time: "18:42"
  },
  {
    id: "a-1",
    role: "assistant",
    text: "Perfecto. Ya registré 77€ en tus gastos de hoy. ¿Quieres ver cómo vas este mes?",
    time: "18:43"
  },
  {
    id: "u-2",
    role: "user",
    text: "Sí, compáralo con mi ritmo del mes pasado.",
    time: "18:43"
  },
  {
    id: "a-2",
    role: "assistant",
    text: "Vas un 14% por encima. Si mantienes este ritmo, terminarás el mes con aproximadamente 1.240€ gastados.",
    time: "18:44",
    accent: "prediction"
  },
  {
    id: "a-3",
    role: "assistant",
    text: "⚠️ A este ritmo podrías quedarte sin dinero antes de fin de mes.",
    time: "18:44",
    accent: "alert"
  }
];

const animationDelays = ["0ms", "90ms", "170ms", "260ms", "340ms"];

export function DemoChat() {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/15 bg-[#0e151d] shadow-glow">
      <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#1c2a33] to-[#1e3c35] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/10 p-1 ring-1 ring-white/15">
            <EuroChatLogo width={32} height={32} title="EuroChat AI" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">EuroChat AI</p>
            <p className="text-xs text-emerald-200">en línea · analizando gastos</p>
          </div>
        </div>
        <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-200">
          Demo
        </span>
      </header>

      <div className="bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.05),transparent_26%),radial-gradient(circle_at_80%_80%,rgba(61,201,159,0.08),transparent_30%),linear-gradient(180deg,#10202d_0%,#112534_100%)] px-3 py-4 sm:px-4">
        <div className="space-y-2.5">
          {conversation.map((item, index) => {
            const isUser = item.role === "user";
            const bubbleTone = isUser
              ? "ml-auto rounded-[1.15rem] rounded-br-md bg-[#d9fdd2] text-[#233126]"
              : item.accent === "alert"
                ? "rounded-[1.15rem] rounded-tl-md border border-amber-300/70 bg-amber-50 text-amber-900"
                : item.accent === "prediction"
                  ? "rounded-[1.15rem] rounded-tl-md border border-mint/45 bg-gradient-to-br from-mint/20 to-cyan-300/15 text-emerald-50"
                  : "rounded-[1.15rem] rounded-tl-md bg-white text-slate-800";

            return (
              <div
                key={item.id}
                className={`max-w-[88%] ${isUser ? "ml-auto" : ""} animate-[bubbleIn_.45s_ease-out_both] px-1`}
                style={{ animationDelay: animationDelays[index] }}
              >
                {!isUser && index > 0 && conversation[index - 1]?.role === "user" ? (
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-white px-3 py-2 shadow-soft animate-[bubbleIn_.35s_ease-out_both]">
                    <span className="h-1.5 w-1.5 animate-[typingDot_1s_ease-in-out_infinite] rounded-full bg-slate-400" />
                    <span className="h-1.5 w-1.5 animate-[typingDot_1s_ease-in-out_.15s_infinite] rounded-full bg-slate-400" />
                    <span className="h-1.5 w-1.5 animate-[typingDot_1s_ease-in-out_.3s_infinite] rounded-full bg-slate-400" />
                  </div>
                ) : null}
                <article className={`px-3.5 py-2.5 text-sm leading-relaxed shadow-soft sm:px-4 ${bubbleTone}`}>
                  <p>{item.text}</p>
                  <div className="mt-1.5 flex items-center justify-end gap-1">
                    <span
                      className={`text-[10px] ${
                        isUser
                          ? "text-emerald-900/70"
                          : item.accent === "prediction"
                            ? "text-emerald-100/85"
                            : item.accent === "alert"
                              ? "text-amber-900/65"
                              : "text-slate-500"
                      }`}
                    >
                      {item.time}
                    </span>
                    {isUser ? <span className="text-[10px] text-emerald-800/70">✓✓</span> : null}
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="border-t border-white/10 bg-[#1a252f] p-3 sm:p-4">
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-[#243540] px-3 py-2 shadow-soft">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-sm text-slate-300">+</span>
          <span className="flex-1 text-left text-sm text-slate-400">Escribe un gasto... (demo visual)</span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-400 text-[11px] font-semibold text-emerald-950">
            ➤
          </span>
        </div>
      </footer>
    </section>
  );
}
