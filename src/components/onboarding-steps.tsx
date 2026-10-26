// OnboardingSteps: the three-step journey (organisation → GitHub → tenant)
// shown on the first-run screen. Pure presentation; `current` is 1-based.
const STEPS = ["Create organisation", "Connect GitHub", "Create tenant"];

export function OnboardingSteps({ current }: Readonly<{ current: 1 | 2 | 3 }>) {
  return (
    <ol className="flex flex-wrap items-center gap-y-2 text-xs" aria-label="Setup progress">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex items-center gap-2 pr-1">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${done ? "bg-success text-on-primary" : active ? "bg-foreground text-on-primary" : "border border-border-strong text-subtle"}`}>{done ? "✓" : n}</span>
            <span className={`whitespace-nowrap ${active ? "font-medium text-foreground" : "text-muted"}`}>{label}</span>
            {n < STEPS.length ? <span aria-hidden className="mx-1 h-px w-6 bg-border-strong" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
