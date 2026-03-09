import { DemoChat } from "@/components/landing/DemoChat";
import { PricingCard } from "@/components/landing/PricingCard";
import { SectionTitle } from "@/components/landing/SectionTitle";
import { benefits, faq } from "@/lib/content";

export default function Home() {
  return (
    <main className="min-h-screen bg-ink bg-hero-gradient text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-5 py-10 sm:px-8 sm:py-16 lg:gap-24 lg:px-12">
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-7">
            <span className="inline-flex rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-mint">
              Finanzas personales con IA
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Controla tus gastos por WhatsApp, sin hojas de cálculo ni apps complejas.
            </h1>
            <p className="max-w-xl text-base text-slate-300 sm:text-lg">
              EuroChat AI convierte tus mensajes diarios en decisiones financieras inteligentes. Registra gastos,
              pregunta por tus hábitos y recibe alertas antes de que el mes se te escape.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-400">
                Probar demo
              </button>
              <button className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10">
                Ver cómo funciona
              </button>
            </div>
          </div>
          <DemoChat />
        </section>

        <section className="space-y-8">
          <SectionTitle
            badge="Demostración"
            title="Así se siente usar EuroChat AI"
            subtitle="El enfoque es simple: hablas como siempre, y tu asistente transforma cada mensaje en claridad financiera."
          />
          <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-3 sm:p-6">
            <div>
              <p className="text-sm font-medium text-mint">1. Envías un gasto</p>
              <p className="mt-2 text-sm text-slate-300">"14€ en café y 52€ en supermercado".</p>
            </div>
            <div>
              <p className="text-sm font-medium text-mint">2. IA organiza y clasifica</p>
              <p className="mt-2 text-sm text-slate-300">Todo se guarda automáticamente por categoría y fecha.</p>
            </div>
            <div>
              <p className="text-sm font-medium text-mint">3. Recibes una predicción</p>
              <p className="mt-2 text-sm text-slate-300">Con una alerta temprana para evitar llegar justo a fin de mes.</p>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <SectionTitle
            badge="Beneficios"
            title="Menos fricción, más control"
            subtitle="Diseñado para personas que quieren entender su dinero sin dedicar horas a gestionar números."
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-2xl border border-white/10 bg-card/70 p-5">
                <h3 className="text-lg font-medium text-white">{benefit.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{benefit.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <SectionTitle
            badge="Precios"
            title="Transparente y simple"
            subtitle="Una tarifa clara para acompañarte cada mes o el plan anual para quienes van en serio."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <PricingCard
              title="Plan mensual"
              price="10€"
              frequency="por mes"
              description="Ideal para empezar a registrar gastos y obtener resúmenes semanales con IA."
            />
            <PricingCard
              title="Plan anual"
              price="59€"
              frequency="por año"
              description="La mejor opción para mantener foco financiero durante todo el año con ahorro incluido."
              highlighted
            />
          </div>
        </section>

        <section className="space-y-8">
          <SectionTitle badge="FAQ" title="Preguntas frecuentes" />
          <div className="space-y-3">
            {faq.map((item) => (
              <article key={item.question} className="rounded-2xl border border-white/10 bg-card/70 p-5">
                <h3 className="text-base font-medium text-white">{item.question}</h3>
                <p className="mt-2 text-sm text-slate-300">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-accent/40 bg-gradient-to-br from-accent/25 via-accent/10 to-transparent p-8 text-center shadow-glow">
          <h2 className="text-3xl font-semibold text-white">Empieza hoy a conversar con tus finanzas.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">
            Cada día que retrasas el control de tus gastos, pierdes visibilidad. Únete a la lista de acceso anticipado y
            sé de los primeros en probar EuroChat AI.
          </p>
          <button className="mt-6 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:opacity-90">
            Unirme al acceso anticipado
          </button>
        </section>
      </div>
    </main>
  );
}
