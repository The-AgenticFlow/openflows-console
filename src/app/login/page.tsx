// Login: the only public page. Split layout: brand panel (what OpenFlows does)
// and a single "Continue with GitHub" action that starts Manager's OAuth flow
// at /auth/github/start. Failure reasons are mapped to plain-language messages
// (never raw text from the query string).
import type { Metadata } from "next";

import { buttonClass } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Sign in" };

const MESSAGES: Record<string, string> = {
  state: "That sign-in link expired or was opened in a different browser. Please start again.",
  denied: "GitHub did not accept the sign-in. Please try again.",
  unavailable: "OpenFlows is temporarily unreachable. Please try again in a moment.",
};

const POINTS = [
  { title: "Issues in, pull requests out", body: "Agents plan, build, review and merge, with your team approving the important decisions." },
  { title: "Your repositories, your rules", body: "OpenFlows only works with the repositories you explicitly authorise on GitHub." },
  { title: "Governed and auditable", body: "Every privileged action is attributed, scoped to your organisation and recorded." },
];

function GithubMark() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: Readonly<{ searchParams: Promise<{ error?: string }> }>) {
  const { error } = await searchParams;
  const message = error ? (MESSAGES[error] ?? MESSAGES.denied) : null;

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-info/10 blur-3xl" />
        <div className="relative flex items-center gap-3 text-lg font-semibold tracking-tight">
          <Logo size={36} className="rounded-xl" /> OpenFlows
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">An autonomous software team, run like a product.</h2>
          <ul className="mt-8 space-y-5">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <div><p className="text-sm font-medium">{p.title}</p><p className="mt-0.5 text-sm text-muted">{p.body}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-subtle">© OpenFlows. Governed AI delivery on your infrastructure.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Logo size={48} className="mb-6 rounded-2xl lg:hidden" />
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted">Use your GitHub account. No separate password to manage.</p>
          {message ? <p role="alert" className="mt-5 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{message}</p> : null}
          {/* Plain anchor on purpose: a full-page redirect to GitHub, not client navigation. */}
          <a href="/auth/github/start?next=%2F" className={`${buttonClass("primary")} mt-6 h-11 w-full`}><GithubMark /> Continue with GitHub</a>
          <p className="mt-5 text-xs leading-relaxed text-subtle">By continuing you agree to sign in with GitHub. OpenFlows only receives access to repositories you explicitly authorise.</p>
        </div>
      </section>
    </main>
  );
}
