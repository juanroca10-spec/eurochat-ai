const conversation = [
  {
    role: "user",
    message: "Hoy gasté 24€ en supermercado, 18€ en taxi y 35€ en cena.",
    time: "18:42"
  },
  {
    role: "assistant",
    message: "Listo ✅ Registré 77€ en tus gastos de hoy. ¿Quieres ver cómo vas este mes?",
    time: "18:43"
  },
  {
    role: "user",
    message: "Sí, ¿cómo voy comparado con el mes pasado?",
    time: "18:43"
  },
  {
    role: "assistant",
    message:
      "Vas un 14% por encima. Si mantienes este ritmo de gasto, terminarás el mes con aproximadamente 1.240€ gastados.",
    time: "18:43",
    highlight: true
  },
  {
    role: "assistant",
    message: "⚠️ A este ritmo podrías quedarte sin dinero antes de fin de mes.",
    time: "18:44",
    warning: true
  }
];

export function DemoChat() {
  return (
    <section className="rounded-3xl border border-white/15 bg-card/80 p-4 shadow-glow backdrop-blur sm:p-6">
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-white">EuroChat AI</p>
          <p className="text-xs text-slate-300">Asistente financiero en WhatsApp</p>
        </div>
        <span className="rounded-full bg-mint/20 px-3 py-1 text-xs font-medium text-mint">Demo en vivo</span>
      </div>

      <div className="space-y-3">
        {conversation.map((item) => (
          <div
            key={`${item.role}-${item.time}-${item.message.slice(0, 16)}`}
            className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-soft ${
              item.role === "user"
                ? "ml-auto bg-accent/80 text-white"
                : item.warning
                  ? "border border-amber-400/40 bg-amber-500/10 text-amber-100"
                  : item.highlight
                    ? "border border-mint/40 bg-mint/10 text-mint"
                    : "bg-white/10 text-slate-100"
            }`}
          >
            <p>{item.message}</p>
            <p className="mt-1 text-right text-[10px] opacity-70">{item.time}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
