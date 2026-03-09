import { ReactNode } from "react";

type SectionTitleProps = {
  badge?: string;
  title: string;
  subtitle?: ReactNode;
};

export function SectionTitle({ badge, title, subtitle }: SectionTitleProps) {
  return (
    <div className="space-y-3 text-center">
      {badge ? (
        <span className="inline-flex rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-mint">
          {badge}
        </span>
      ) : null}
      <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mx-auto max-w-2xl text-base text-slate-300 sm:text-lg">{subtitle}</p> : null}
    </div>
  );
}
