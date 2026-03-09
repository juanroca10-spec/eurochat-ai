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
  return (
    <section className="mx-auto w-full max-w-[390px] overflow-hidden rounded-[2rem] border border-[#d6cfc6] bg-[#ece5dd] shadow-glow">
      <div className="h-6 bg-[#1f2c34]" />

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
        {conversation.map((item, index) => {
          const isUser = item.role === "user";

          return (
            <div key={item.id} className={`max-w-[83%] ${isUser ? "ml-auto" : ""}`}>
              {!isUser ? (
                <div
                  className="mb-1 inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-[10px] text-slate-500 shadow-sm animate-[bubbleIn_.2s_ease-out_both]"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  EuroChat AI está escribiendo...
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-[typingDot_1s_ease-in-out_infinite] rounded-full bg-slate-400" />
                    <span className="h-1.5 w-1.5 animate-[typingDot_1s_ease-in-out_.15s_infinite] rounded-full bg-slate-400" />
                    <span className="h-1.5 w-1.5 animate-[typingDot_1s_ease-in-out_.3s_infinite] rounded-full bg-slate-400" />
                  </span>
                </div>
              ) : null}

              <article
                className={`animate-[bubbleIn_.28s_ease-out_both] rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-sm ${
                  isUser ? "rounded-br-md bg-[#DCF8C6] text-[#1f3120]" : "rounded-tl-md bg-white text-slate-800"
                }`}
                style={{ animationDelay: `${index * 70 + 40}ms` }}
              >
                <p>{item.message}</p>
                <p className={`mt-1 text-right text-[10px] ${isUser ? "text-emerald-900/65" : "text-slate-500"}`}>{item.time}</p>
              </article>
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
  );
}
