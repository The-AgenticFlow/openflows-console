// GithubSignInButton: the sign-in page's only action. It stays a plain anchor
// (a full-page redirect into Manager's OAuth flow, not client navigation) so it
// works before hydration; once clicked it shows "Redirecting to GitHub…" with a
// spinner and ignores further clicks, so an impatient double click cannot start
// two OAuth flows. If the visitor comes back via the browser's back button
// (page restored from the back/forward cache) the button resets. Labels are
// passed in by the server page in the visitor's language.
"use client";

import { type MouseEvent, useEffect, useState } from "react";

import { buttonClass, Spinner } from "../ui/button";

function GithubMark() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function GithubSignInButton({ href, label, redirectingLabel, className = "" }: Readonly<{ href: string; label: string; redirectingLabel: string; className?: string }>) {
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) setRedirecting(false); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (redirecting) { e.preventDefault(); return; }
    // Let modified clicks (new tab/window) behave normally without locking the button.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    setRedirecting(true);
  }

  return (
    <a
      href={href}
      onClick={onClick}
      aria-disabled={redirecting || undefined}
      aria-busy={redirecting || undefined}
      className={`${buttonClass("primary")} ${redirecting ? "pointer-events-none opacity-80" : ""} ${className}`}
    >
      {redirecting ? <Spinner /> : <GithubMark />}
      <span aria-live="polite">{redirecting ? redirectingLabel : label}</span>
    </a>
  );
}
