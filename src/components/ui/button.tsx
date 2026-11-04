// Button + LinkButton: the one place button styling lives. Variants map to
// intent (primary action, quiet secondary, destructive). `loading` disables
// the control and shows a spinner while keeping its width stable. Buttons give
// tactile feedback (a slight press scale) using the shared motion tokens.
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex h-9 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)] hover:bg-primary-hover",
  secondary: "border border-border-strong bg-surface-raised text-foreground hover:border-subtle/50 hover:bg-surface-muted",
  ghost: "text-muted hover:bg-surface-muted hover:text-foreground",
  danger: "bg-danger text-on-primary hover:bg-danger/90",
};

export const buttonClass = (variant: Variant = "secondary") => `${base} ${variants[variant]}`;

export function Spinner({ className = "h-4 w-4" }: Readonly<{ className?: string }>) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  variant = "secondary",
  loading = false,
  children,
  disabled,
  ...rest
}: Readonly<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; children: ReactNode }>) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClass(variant)} ${rest.className ?? ""}`}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "secondary",
  children,
}: Readonly<{ href: string; variant?: Variant; children: ReactNode }>) {
  return (
    <Link href={href} className={buttonClass(variant)}>
      {children}
    </Link>
  );
}
