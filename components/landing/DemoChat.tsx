"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCheck,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Signal,
  Smile,
  Video,
  Wifi,
  BatteryFull,
  ChevronLeft,
  Camera,
} from "lucide-react";

type ChatItem = {
  id: string;
  role: "user" | "assistant";
  message: string;
  time: string;
  prediction?: boolean;
  chart?: boolean;
};

const conversation: ChatItem[] = [
  {
    id: "u1",
    role: "user",
    message: "Supermercado 12€",
    time: "18:41",
  },
  {
    id: "a1",
    role: "assistant",
    message: "✅ Gasto registrado\nCategoría: Alimentación",
    time: "18:41",
  },
  {
    id: "a2",
    role: "assistant",
    message: "Hoy llevas 23€ gastados.",
    time: "18:42",
  },
  {
    id: "u2",
    role: "user",
    message: "¿Cómo voy este mes?",
    time: "18:43",
  },
  {
    id: "a3",
    role: "assistant",
    message:
      "📊 Marzo\n\nAlimentación: 210€\nTransporte: 55€\nOcio: 80€\n\nTotal: 345€",
    time: "18:43",
  },
  {
    id: "a3b",
    role: "assistant",
    message: "Distribución de gastos",
    time: "18:43",
    chart: true,
  },
  {
    id: "a4",
    role: "assistant",
    message:
      "Si mantienes este ritmo, terminarás el mes con aproximadamente 1.240€ gastados.",
    time: "18:44",
    prediction: true,
  },
  {
    id: "a5",
    role: "assistant",
    message: "Eso es un 14% más que el mes pasado.",
    time: "18:44",
  },
  {
    id: "a6",
    role: "assistant",
    message: "⚠️ A este ritmo podrías quedarte sin dinero el día 24.",
    time: "18:45",
  },
];

function EuroChatAvatar() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/10 backdrop-blur-sm">
      <svg
        width="24"
        height="24"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="EuroChat AI"
      >
        <defs>
          <linearGradient
            id="eurochatGradient"
            x1="10"
            y1="10"
            x2="54"
            y2="54"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#34D399" />
            <stop offset="1" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <path
          d="M32 8C19.85 8 10 17.1 10 28.33C10 34.48 12.98 40 18.08 43.72L16.3 53.5C16.16 54.27 16.96 54.88 17.65 54.52L28.5 48.82C29.64 48.97 30.81 49.05 32 49.05C44.15 49.05 54 39.95 54 28.72C54 17.48 44.15 8.38 32 8.38V8Z"
          fill="url(#eurochatGradient)"
        />
        <path
          d="M39.8 21.7C38.35 20.4 36.45 19.68 34.18 19.68C30.14 19.68 26.9 22.08 25.78 26H22.8V29.12H25.26C25.24 29.4 25.22 29.7 25.22 30.02C25.22 30.4 25.24 30.76 25.28 31.1H22.8V34.22H25.86C27.06 38 30.26 40.3 34.18 40.3C36.48 40.3 38.36 39.52 39.86 38.1L37.72 35.68C36.74 36.56 35.58 36.98 34.34 36.98C32.04 36.98 30.16 35.94 29.3 34.22H36.44V31.1H28.58C28.54 30.76 28.52 30.4 28.52 30.02C28.52 29.7 28.54 29.4 28.58 29.12H36.44V26H29.34C30.24 24.16 32.1 23 34.42 23C35.7 23 36.82 23.42 37.8 24.24L39.8 21.7Z"
          fill="white"
        />
      </svg>
    </div>
  );
}

function getAssistantStatus(typingId: string | null) {
  if (typingId === "a3") return "preparando resumen";
  if (typingId === "a3b") return "generando gráfico";
  if (typingId === "a4") return "analizando gastos";
  if (typingId) return "escribiendo...";
  return "en línea";
}

export function DemoChat() {
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [typingId, setTypingId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    const schedule = (index: number) => {
      if (index >= conversation.length) return;

      const current = conversation[index];

      if (current.role === "assistant") {
        setTypingId(current.id);

        const typingDuration = current.chart
          ? 1700
          : current.prediction
          ? 1800
          : current.id === "a3"
          ? 1500
          : current.message.length < 40
          ? 900
          : 1200;

        const afterRevealDelay = current.chart
          ? 1200
          : current.prediction
          ? 1300
          : 850;

        const typingTimer = setTimeout(() => {
          setTypingId(null);
          setVisibleIds((prev) => [...prev, current.id]);

          const nextTimer = setTimeout(() => {
            schedule(index + 1);
          }, afterRevealDelay);

          timers.push(nextTimer);
        }, typingDuration);

        timers.push(typingTimer);
        return;
      }

      const userDelay = index === 0 ? 500 : 700;

      const userTimer = setTimeout(() => {
        setVisibleIds((prev) => [...prev, current.id]);

        const nextTimer = setTimeout(() => {
          schedule(index + 1);
        }, 900);

        timers.push(nextTimer);
      }, userDelay);

      timers.push(userTimer);
    };

    schedule(0);

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const visibleSet = useMemo(() => new Set(visibleIds), [visibleIds]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleIds, typingId]);

  const assistantStatus = getAssistantStatus(typingId);

  return (
    <>
      <div className="mx-auto w-full max-w-[400px] rounded-[3rem] bg-[linear-gradient(180deg,#111827_0%,#0b1018_100%)] p-[7px] shadow-[0_35px_100px_rgba(2,6,23,0.65)] ring-1 ring-white/10">
        <div className="relative overflow-hidden rounded-[2.65rem] border border-white/10 bg-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_26%)] pointer-events-none" />

          <div className="relative flex h-8 items-center justify-between bg-[#0f1720] px-4 text-[10px] font-medium text-white/90">
            <span>18:45</span>
            <div className="absolute left-1/2 top-1.5 h-5 w-28 -translate-x-1/2 rounded-full bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
            <div className="flex items-center gap-1.5 text-white/75">
              <Signal size={11} strokeWidth={2.2} />
              <Wifi size={11} strokeWidth={2.2} />
              <BatteryFull size={12} strokeWidth={2.2} />
            </div>
          </div>

          <header className="relative flex items-center justify-between bg-[#075e54] px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <button className="grid h-7 w-7 place-items-center rounded-full text-white/90 transition hover:bg-white/10">
                <ChevronLeft size={18} strokeWidth={2.4} />
              </button>

              <EuroChatAvatar />

              <div>
                <p className="text-[13px] font-semibold text-white">EuroChat AI</p>
                <p className="text-[10px] text-emerald-100/95">{assistantStatus}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-white/90">
              <button className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-white/10">
                <Video size={15} strokeWidth={2.2} />
              </button>
              <button className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-white/10">
                <Phone size={15} strokeWidth={2.2} />
              </button>
              <button className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-white/10">
                <MoreVertical size={15} strokeWidth={2.2} />
              </button>
            </div>
          </header>

          <div
            className="h-[455px] px-3 py-4"
            style={{
              backgroundColor: "#ece5dd",
              backgroundImage: `
                radial-gradient(rgba(255,255,255,0.18) 0.8px, transparent 0.8px),
                radial-gradient(rgba(0,0,0,0.014) 0.8px, transparent 0.8px),
                linear-gradient(180deg, #efeae2 0%, #ece5dd 100%)
              `,
              backgroundSize: "22px 22px, 22px 22px, 100% 100%",
              backgroundPosition: "0 0, 11px 11px, 0 0",
            }}
          >
            <div className="h-full overflow-y-auto scroll-smooth pr-1">
              <div className="flex min-h-full flex-col gap-1.5">
                {conversation.map((item) => {
                  const isUser = item.role === "user";
                  const isVisible = visibleSet.has(item.id);
                  const isTyping = typingId === item.id && item.role === "assistant";

                  if (!isVisible && !isTyping) return null;

                  return (
                    <div
                      key={item.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div className="max-w-[82%]">
                        {isTyping ? (
                          <div className="bubble-in mb-1 inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-white/95 px-3 py-2 text-[11px] text-slate-500 shadow-[0_3px_10px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                            <span>
                              {item.chart
                                ? "EuroChat AI está generando gráfico"
                                : item.prediction
                                ? "EuroChat AI está analizando gastos"
                                : "EuroChat AI está escribiendo"}
                            </span>
                            <span className="flex gap-1">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                            </span>
                          </div>
                        ) : null}

                        {isVisible ? (
                          <article
                            className={`bubble-in rounded-[1.15rem] px-3 py-2 text-[13px] leading-[1.35] shadow-[0_3px_10px_rgba(0,0,0,0.08)] ${
                              isUser
                                ? "rounded-br-md bg-[#DCF8C6] text-[#1f3120]"
                                : item.prediction
                                ? "rounded-tl-md bg-white text-slate-800 ring-1 ring-emerald-200/80"
                                : item.chart
                                ? "rounded-tl-md bg-white text-slate-800"
                                : "rounded-tl-md bg-white text-slate-800"
                            }`}
                          >
                            {item.chart ? (
                              <div className="chart-card w-[226px] overflow-hidden rounded-2xl border border-slate-100 bg-white">
                                <div className="mb-3 flex items-start justify-between rounded-xl bg-slate-50/80 px-3 py-2">
                                  <div>
                                    <p className="text-[11px] font-semibold text-slate-700">
                                      Distribución de gastos
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-slate-400">Marzo</p>
                                  </div>
                                  <div className="grid h-7 w-7 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
                                    <Camera size={14} strokeWidth={2.2} />
                                  </div>
                                </div>

                                <div className="space-y-3 px-3 pb-3">
                                  <div>
                                    <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
                                      <span>Alimentación</span>
                                      <span>210€</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100">
                                      <div className="bar-grow h-2 rounded-full bg-emerald-500" style={{ width: "78%" }} />
                                    </div>
                                  </div>

                                  <div>
                                    <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
                                      <span>Transporte</span>
                                      <span>55€</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100">
                                      <div
                                        className="bar-grow h-2 rounded-full bg-cyan-500"
                                        style={{ width: "28%", animationDelay: "0.12s" }}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
                                      <span>Ocio</span>
                                      <span>80€</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100">
                                      <div
                                        className="bar-grow h-2 rounded-full bg-violet-500"
                                        style={{ width: "36%", animationDelay: "0.24s" }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
                                  Total:{" "}
                                  <span className="font-semibold text-slate-700">345€</span>
                                </div>
                              </div>
                            ) : item.prediction ? (
                              <>
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                                  Predicción mensual
                                </p>
                                <p>
                                  Si mantienes este ritmo, terminarás el mes con
                                  aproximadamente{" "}
                                  <span className="font-semibold text-emerald-700">
                                    1.240€ gastados
                                  </span>
                                  .
                                </p>
                              </>
                            ) : (
                              <p className="whitespace-pre-line">{item.message}</p>
                            )}

                            <div className="mt-1 flex items-center justify-end gap-1">
                              <span className="text-[10px] text-slate-500">{item.time}</span>
                              {isUser ? (
                                <CheckCheck size={12} className="text-[#53bdeb]" />
                              ) : null}
                            </div>
                          </article>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                <div ref={endRef} />
              </div>
            </div>
          </div>

          <footer className="border-t border-[#d8d1c8] bg-[#f0f2f5] px-2.5 py-2">
            <div className="flex items-center gap-2">
              <button className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500 shadow-sm transition hover:bg-slate-50">
                <Smile size={17} strokeWidth={2.1} />
              </button>

              <div className="flex flex-1 items-center rounded-full bg-white px-4 py-2.5 shadow-sm">
                <span className="flex-1 text-left text-sm text-slate-400">
                  Escribe un mensaje...
                </span>
                <Paperclip size={16} className="text-slate-400" strokeWidth={2.1} />
              </div>

              <button className="grid h-9 w-9 place-items-center rounded-full bg-[#24c160] text-white shadow-sm transition hover:brightness-105">
                <Mic size={17} strokeWidth={2.1} />
              </button>
            </div>
          </footer>
        </div>
      </div>

      <style jsx>{`
        .bubble-in {
          animation: bubbleIn 0.38s ease-out;
        }

        .chart-card {
          animation: chartFade 0.55s ease-out;
        }

        .bar-grow {
          transform-origin: left center;
          animation: barGrow 0.85s ease-out both;
        }

        @keyframes bubbleIn {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes chartFade {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes barGrow {
          0% {
            transform: scaleX(0);
            opacity: 0.7;
          }
          100% {
            transform: scaleX(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}