// Route-level error boundary: a calm, recoverable message. Never renders the
// raw error text (it can carry internal detail); the digest is a support ID.
// Text follows the visitor's language.
"use client";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useT } from "@/lib/preferences/client";

export default function ErrorPage({ error, reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  const { t } = useT();
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl" />
      <div className="relative flex animate-enter flex-col items-center">
      <Logo size={44} className="mb-6 rounded-xl" />
      <h1 className="text-2xl font-semibold tracking-tight">{t.pages.error}</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{t.pages.errorBody}</p>
      {error.digest ? <p className="mt-3 font-mono text-xs text-subtle">{t.pages.reference}: {error.digest}</p> : null}
      <div className="mt-6"><Button variant="primary" onClick={reset}>{t.common.retry}</Button></div>
      </div>
    </main>
  );
}
