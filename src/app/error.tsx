// Route-level error boundary: a calm, recoverable message. Never renders the
// raw error text (it can carry internal detail); the digest is a support ID.
"use client";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function ErrorPage({ error, reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo size={44} className="mb-6 rounded-xl" />
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted">We could not load this page. Try again, and if it keeps happening contact your platform operator.</p>
      {error.digest ? <p className="mt-3 font-mono text-xs text-subtle">Reference: {error.digest}</p> : null}
      <div className="mt-6"><Button variant="primary" onClick={reset}>Try again</Button></div>
    </main>
  );
}
