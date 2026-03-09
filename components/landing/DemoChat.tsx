import { EuroChatLogo } from "@/components/EuroChatLogo";

type ChatItem = {
  id: string;
  role: "user" | "assistant";
  message: string;
  time: string;
};

const quickActions = ["Café 3€", "Uber 12€", "Cena 20€"];

const conversation: ChatItem[] = [
  { id: "u1", role: "user", message: "Café 3€", time: "18:41" },
  { id: "a1", role: "assistant", message: "Gasto registrado", time: "18:41" },
  { id: "u2", role: "user", message: "Uber 12€", time: "18:42" },
  { id: "a2", role: "assistant", message: "Gasto registrado", time: "18:42" },
  { id: "u3", role: "user", message: "Cena 20€", time: "18:43" },
  { id: "a3", role: "assistant", message: "Gasto registrado", time: "18:43" },
  { id: "a4", role: "assistant", message: "Hoy gastaste 15€", time: "18:43" },
  {
    id: "a5",
    role: "assistant",
    message: "Si mantienes este ritmo, gastarás aproximadamente 1.240€ este mes.",
    time: "18:44"
  },
  {
    id: "a6",
    role: "assistant",
    message: "⚠️ Podrías quedarte sin dinero el día 24.",
    time: "18:44"
  }
];

export function DemoChat() {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#d4cdc2] bg-[#efeae2] shadow-glow">
      <header className="flex items-center gap-3 bg-[#115e54] px-4 py-3 sm:px-5">
        <div className="rounded-full bg-white/20 p-1">
          <EuroChatLogo width={30} height={30} title="EuroChat AI avatar" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">EuroChat AI</p>
          <p className="text-xs text-emerald-100">en línea</p>
        </div>
      </header>

      <div className="space-y-3 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.45),transparent_34%),linear-gradient(180deg,#efeae2_0%,#ece5dd_100%)] px-3 py-4 sm:px-4">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, idx) => (
            <button
              key={action}
              className="animate-[bubbleIn_.32s_ease-out_both] rounded-full border border-[#d8d1c8] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {action}
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          {conversation.map((item, index) => {
            const isUser = item.role === "user";
            const bubbleClass = isUser
              ? "ml-auto rounded-2xl rounded-br-md bg-[#DCF8C6] text-[#1f3120]"
              : "rounded-2xl rounded-tl-md bg-white text-slate-800";

            return (
              <div key={item.id} className={`max-w-[88%] ${isUser ? "ml-auto" : ""}`}>
                {!isUser ? (
                  <div
                    className="mb-1 inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-white px-3 py-1.5 text-[11px] text-slate-500 shadow-sm animate-[bubbleIn_.24s_ease-out_both]"
                    style={{ animationDelay: `${index * 85}ms` }}
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
                  className={`animate-[bubbleIn_.36s_ease-out_both] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${bubbleClass}`}
                  style={{ animationDelay: `${index * 95 + 60}ms` }}
                >
                  <p>{item.message}</p>
                  <p className={`mt-1 text-right text-[10px] ${isUser ? "text-emerald-900/65" : "text-slate-500"}`}>{item.time}</p>
                </article>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="border-t border-[#d8d1c8] bg-[#f7f4ef] p-3">
        <div className="flex items-center gap-2 rounded-full border border-[#d9d1c7] bg-white px-3 py-2 shadow-sm">
          <span className="text-base text-slate-400">😊</span>
          <span className="flex-1 text-left text-sm text-slate-400">Escribe un mensaje...</span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#24c160] text-xs text-white">➤</span>
        </div>
      </footer>
    </section>
  );
}
