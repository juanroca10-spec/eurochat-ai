type PricingCardProps = {
  title: string;
  price: string;
  frequency: string;
  description: string;
  highlighted?: boolean;
};

export function PricingCard({ title, price, frequency, description, highlighted }: PricingCardProps) {
  return (
    <article
      className={`rounded-3xl border p-6 shadow-soft transition-transform duration-300 hover:-translate-y-1 ${
        highlighted
          ? "border-accent/80 bg-gradient-to-b from-accent/20 to-card"
          : "border-white/10 bg-card/80"
      }`}
    >
      <p className="text-sm text-slate-300">{title}</p>
      <p className="mt-2 text-4xl font-semibold text-white">{price}</p>
      <p className="text-sm text-slate-300">{frequency}</p>
      <p className="mt-4 text-sm leading-relaxed text-slate-200">{description}</p>
      <button className="mt-6 w-full rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
        Quiero acceso anticipado
      </button>
    </article>
  );
}
