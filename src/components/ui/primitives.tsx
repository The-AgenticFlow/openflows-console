// Small shared presentation primitives: Card, Badge, PageHeader, EmptyState,
// ErrorNotice, Skeleton, StatCard, Avatar, plus the layout pieces the richer
// pages share (SettingsSection, Field rows with copy, SegmentedControl,
// SearchInput, StatusDot). No data fetching here: they only format what they
// are given. Text that belongs to the primitive itself ("Try again", "Request
// ID", "Copied") comes from the active language; ErrorNotice also re-translates
// known Manager error codes. Entrance motion (`animate-enter`) lives on the
// page-level pieces (PageHeader, cards) so every screen arrives the same way.
"use client";

import { type ReactNode, useState } from "react";

import type { ConsoleError } from "@/lib/client/api";
import { errorCopy } from "@/lib/i18n";
import { useT } from "@/lib/preferences/client";

import { IconAlert, IconCheck, IconInbox, IconInfo, IconRefresh } from "./icons";

export function Card({ children, className = "" }: Readonly<{ children: ReactNode; className?: string }>) {
  return <section className={`animate-enter rounded-xl border border-border bg-surface shadow-sm shadow-shadow ${className}`}>{children}</section>;
}

export function CardHeader({
  title,
  description,
  action,
  icon,
}: Readonly<{ title: string; description?: string; action?: ReactNode; icon?: ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <span aria-hidden className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted text-muted">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted ring-border-strong",
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  danger: "bg-danger-soft text-danger ring-danger/20",
  info: "bg-info-soft text-info ring-info/20",
};
const dots: Record<Tone, string> = {
  neutral: "bg-subtle", success: "bg-success", warning: "bg-warning", danger: "bg-danger", info: "bg-info",
};

/** Status pill. `dot` adds a leading status dot; `live` makes it pulse (in-progress states). */
export function Badge({ tone = "neutral", dot = false, live = false, children }: Readonly<{ tone?: Tone; dot?: boolean; live?: boolean; children: ReactNode }>) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {dot || live ? <StatusDot tone={tone} live={live} /> : null}
      {children}
    </span>
  );
}

export function StatusDot({ tone = "neutral", live = false }: Readonly<{ tone?: Tone; live?: boolean }>) {
  return (
    <span aria-hidden className="relative flex h-1.5 w-1.5 shrink-0">
      {live ? <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${dots[tone]}`} /> : null}
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dots[tone]}`} />
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: Readonly<{ title: string; description?: string; action?: ReactNode; eyebrow?: ReactNode }>) {
  return (
    <div className="mb-8 flex animate-enter flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-accent">{eyebrow}</div> : null}
        <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: Readonly<{ title: string; description: string; action?: ReactNode; icon?: ReactNode }>) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span aria-hidden className="relative mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong bg-surface-raised text-muted shadow-lg shadow-shadow">
        {icon ?? <IconInbox size={18} />}
        <span className="absolute -inset-3 -z-10 rounded-2xl bg-accent/5 blur-xl" />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Renders a ConsoleError: what happened, how to recover, request ID for support. */
export function ErrorNotice({ error, onRetry }: Readonly<{ error: ConsoleError | Error; onRetry?: () => void }>) {
  const { t } = useT();
  const c = error as Partial<ConsoleError>;
  const copy = errorCopy(t, c.code);
  const message = copy?.message ?? error.message;
  const recovery = copy ? copy.recovery : c.recovery;
  return (
    <div role="alert" className="flex animate-pop gap-3 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
      <IconAlert size={16} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{message}</p>
        {recovery ? <p className="mt-0.5 opacity-90">{recovery}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          {c.requestId && c.requestId !== "-" ? (
            <span className="font-mono opacity-80">{t.common.requestId}: {c.requestId}</span>
          ) : null}
          {onRetry && c.retryable !== false ? (
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-medium underline underline-offset-2">
              <IconRefresh size={12} /> {t.common.retry}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Shimmering placeholder block for loading states. */
export function Skeleton({ className = "h-4 w-full" }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-hidden
      className={`animate-shimmer rounded-md bg-[length:200%_100%] bg-[linear-gradient(90deg,var(--surface-muted)_0%,var(--skeleton-hi)_50%,var(--surface-muted)_100%)] ${className}`}
    />
  );
}

/** Shown when Manager does not offer an endpoint yet. Honest, not an error. */
export function NotAvailable({ title, description }: Readonly<{ title: string; description: string }>) {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span aria-hidden className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border-strong bg-surface-raised text-subtle">
        <IconInfo size={16} />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      <div className="mt-3"><Badge tone="neutral">{t.primitives.notAvailableBadge}</Badge></div>
    </div>
  );
}

/** Metric tile. `icon` sits top-right in a tinted chip; `tone` colours the chip and a soft top glow. */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: Readonly<{ label: string; value: ReactNode; hint?: string; tone?: "neutral" | "success" | "warning" | "danger" | "info"; icon?: ReactNode }>) {
  const chip = {
    neutral: "bg-surface-muted text-muted",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  }[tone];
  const glow = { neutral: "from-hover", success: "from-success/[0.07]", warning: "from-warning/[0.07]", danger: "from-danger/[0.08]", info: "from-info/[0.07]" }[tone];
  return (
    <div className="group relative animate-enter overflow-hidden rounded-xl border border-border bg-surface px-5 py-4 shadow-sm shadow-shadow transition-colors duration-200 hover:border-border-strong">
      <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${glow} to-transparent`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="text-xs font-medium text-muted">{label}</div>
        {icon ? <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${chip}`}>{icon}</span> : null}
      </div>
      <div className="relative mt-1 text-[1.65rem] font-semibold leading-tight tracking-tight tabular-nums">{value}</div>
      {hint ? <div className="relative mt-1 truncate text-xs text-subtle">{hint}</div> : <div className="mt-1 h-[18px]" />}
    </div>
  );
}

export function Avatar({ name, size = 28 }: Readonly<{ name: string; size?: number }>) {
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/40 to-violet/40 font-semibold text-foreground ring-1 ring-border-strong" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {name.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}

/**
 * A settings block in the two-column style used by Vercel/Linear: title and
 * explanation on the left, the controls on the right (stacked on small
 * screens). `danger` tints the frame for irreversible actions.
 */
export function SettingsSection({
  title,
  description,
  children,
  footer,
  danger = false,
}: Readonly<{ title: string; description?: string; children: ReactNode; footer?: ReactNode; danger?: boolean }>) {
  return (
    <section className={`animate-enter overflow-hidden rounded-xl border bg-surface shadow-sm shadow-shadow ${danger ? "border-danger/30" : "border-border"}`}>
      <div className="grid gap-6 p-6 md:grid-cols-[240px_minmax(0,1fr)]">
        <div>
          <h2 className={`text-sm font-semibold ${danger ? "text-danger" : ""}`}>{title}</h2>
          {description ? <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p> : null}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
      {footer ? <div className={`flex flex-wrap items-center justify-end gap-3 border-t px-6 py-3 ${danger ? "border-danger/20 bg-danger-soft" : "border-border bg-surface-muted/60"}`}>{footer}</div> : null}
    </section>
  );
}

/** Copy-to-clipboard icon button with a short "Copied" confirmation. */
export function CopyButton({ value, label }: Readonly<{ value: string; label: string }>) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { void navigator.clipboard?.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }}
      aria-label={`${t.common.copy} ${label}`}
      className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted transition-colors hover:bg-hover hover:text-foreground"
    >
      {copied ? <><IconCheck size={12} className="text-accent" /> {t.common.copied}</> : t.common.copy}
    </button>
  );
}

/** A label/value row for detail lists; `copy` adds a copy button for identifiers. */
export function Field({ label, children, copy, mono = false }: Readonly<{ label: string; children: ReactNode; copy?: string; mono?: boolean }>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`flex min-w-0 items-center gap-2 text-sm ${mono ? "font-mono text-[13px]" : ""}`}>
        <span className="truncate">{children}</span>
        {copy ? <CopyButton value={copy} label={label} /> : null}
      </dd>
    </div>
  );
}

/** A small set of mutually exclusive options rendered as a segmented control (radio group). */
export function SegmentedControl<V extends string>({
  label,
  value,
  options,
  onChange,
}: Readonly<{ label: string; value: V; options: { value: V; label: string; icon?: ReactNode }[]; onChange: (v: V) => void }>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-surface-muted p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-all duration-150 ${active ? "bg-surface text-foreground shadow-sm shadow-shadow ring-1 ring-border" : "text-muted hover:text-foreground"}`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Compact search/filter input with a leading magnifier. */
export function SearchInput({ value, onChange, placeholder, label }: Readonly<{ value: string; onChange: (v: string) => void; placeholder: string; label: string }>) {
  return (
    <label className="relative block w-full max-w-xs">
      <span className="sr-only">{label}</span>
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-sm placeholder:text-subtle"
      />
    </label>
  );
}

/** Standard text input styling, shared so every form field looks the same. */
export const inputClass =
  "h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm placeholder:text-subtle disabled:opacity-60 aria-[invalid=true]:border-danger";
export const selectClass = "h-9 rounded-lg border border-border-strong bg-surface px-2.5 text-sm";
