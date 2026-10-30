// OnboardingSteps: the three-step journey (organisation → GitHub → tenant)
// shown on the first-run screen. Pure presentation; `current` is 1-based.
// Labels follow the active language.
"use client";

import { useT } from "@/lib/preferences/client";

export function OnboardingSteps({ current }: Readonly<{ current: 1 | 2 | 3 }>) {
  const { t } = useT();
  const STEPS = t.onboarding.steps;
  return (
    <ol className="flex flex-wrap items-center gap-y-2 text-xs" aria-label={t.onboarding.progress}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex items-center gap-2 pr-1">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${done ? "bg-accent text-on-primary" : active ? "bg-foreground text-on-primary ring-4 ring-border-strong" : "border border-border-strong text-subtle"}`}>{done ? <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m2.5 6.2 2.2 2.2 4.8-4.8" strokeLinecap="round" strokeLinejoin="round" /></svg> : n}</span>
            <span className={`whitespace-nowrap ${active ? "font-medium text-foreground" : "text-muted"}`}>{label}</span>
            {n < STEPS.length ? <span aria-hidden className="mx-1 h-px w-6 bg-border-strong" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
