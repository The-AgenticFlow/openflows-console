// Small shared presentation primitives: Card, Badge, PageHeader, EmptyState,
// ErrorNotice. No data fetching here: they only format what they are given.
import type { ReactNode } from "react";

import type { ConsoleError } from "@/lib/client/api";

export function Card({ children, className = "" }: Readonly<{ children: ReactNode; className?: string }>) {
  return <section className={`rounded-xl border border-border bg-surface ${className}`}>{children}</section>;
}

export function CardHeader({
  title,
  description,
  action,
}: Readonly<{ title: string; description?: string; action?: ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "info";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export function Badge({ tone = "neutral", children }: Readonly<{ tone?: Tone; children: ReactNode }>) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: Readonly<{ title: string; description?: string; action?: ReactNode }>) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: Readonly<{ title: string; description: string; action?: ReactNode }>) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Renders a ConsoleError: what happened, how to recover, request ID for support. */
export function ErrorNotice({ error, onRetry }: Readonly<{ error: ConsoleError | Error; onRetry?: () => void }>) {
  const c = error as Partial<ConsoleError>;
  return (
    <div role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
      <p className="font-medium">{error.message}</p>
      {c.recovery ? <p className="mt-0.5 opacity-90">{c.recovery}</p> : null}
      <div className="mt-2 flex items-center gap-3 text-xs">
        {c.requestId && c.requestId !== "-" ? (
          <span className="font-mono opacity-80">Request ID: {c.requestId}</span>
        ) : null}
        {onRetry && c.retryable !== false ? (
          <button type="button" onClick={onRetry} className="font-medium underline underline-offset-2">
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Pulsing placeholder block for loading states. */
export function Skeleton({ className = "h-4 w-full" }: Readonly<{ className?: string }>) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-surface-muted ${className}`} />;
}

/** Shown when Manager does not offer an endpoint yet. Honest, not an error. */
export function NotAvailable({ title, description }: Readonly<{ title: string; description: string }>) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span aria-hidden className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-border-strong text-subtle">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10" r="7" /><path d="M10 6.5v4M10 13.5h.01" strokeLinecap="round" /></svg>
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      <div className="mt-3"><Badge tone="neutral">Not available on this Manager yet</Badge></div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: Readonly<{ label: string; value: ReactNode; hint?: string; tone?: "neutral" | "success" | "warning" | "danger" }>) {
  const dot = { neutral: "bg-subtle", success: "bg-success", warning: "bg-warning", danger: "bg-danger" }[tone];
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4">
      <div className="flex items-center gap-2 text-xs text-muted"><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-subtle">{hint}</div> : null}
    </div>
  );
}

export function Avatar({ name, size = 28 }: Readonly<{ name: string; size?: number }>) {
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface-muted font-semibold text-foreground ring-1 ring-border-strong" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {name.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
