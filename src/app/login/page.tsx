// Login: the only public page. Split layout. The left brand panel has the
// interactive dotted-Earth globe as its background (agents passing work
// between hubs; it reacts to the cursor and can be dragged) with the value
// statement centred over it; the right panel holds a sign-in card with a single
// "Continue with GitHub" action that starts Manager's OAuth flow at
// /auth/github/start. Failure reasons are mapped to plain-language messages
// (never raw text from the query string). Text over the globe is
// `pointer-events-none` so the globe stays draggable; a left vignette keeps the
// copy legible. On small screens the brand panel is hidden. The sign-in form
// sits directly on the panel (no card); its footer shows operator-configured
// links (docs, status, privacy, terms, support) only when they are set, plus
// the Console version. All text follows the visitor's language; the brand
// panel is pinned to the dark theme (data-theme="dark") because the globe is a
// night-sky visual, while the sign-in panel follows the chosen theme. A small
// language/theme switch sits in the sign-in panel's header.
import type { Metadata } from "next";

import { GithubSignInButton } from "@/components/login/github-sign-in-button";
import { PrefsSwitch } from "@/components/login/prefs-switch";
import { WorldGlobe } from "@/components/login/world-globe";
import { IconAlert, IconGitPullRequest, IconLock, IconShield } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { getLink } from "@/lib/config/env";
import { getMessages } from "@/lib/i18n/server";

import { version } from "../../../package.json";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.login.metaTitle };
}

export default async function LoginPage({ searchParams }: Readonly<{ searchParams: Promise<{ error?: string; expired?: string }> }>) {
  const [{ error, expired }, { t }] = await Promise.all([searchParams, getMessages()]);
  const l = t.login;
  const errors: Record<string, string> = { state: l.errState, denied: l.errDenied, unavailable: l.errUnavailable };
  const message = expired ? l.expired : error ? (errors[error] ?? l.errDenied) : null;
  const points = [
    { icon: IconGitPullRequest, title: l.point1Title, body: l.point1Body },
    { icon: IconLock, title: l.point2Title, body: l.point2Body },
    { icon: IconShield, title: l.point3Title, body: l.point3Body },
  ];
  const support = getLink("OPENFLOWS_SUPPORT_URL");
  const links = [
    { label: l.docs, href: getLink("OPENFLOWS_DOCS_URL") },
    { label: l.status, href: getLink("OPENFLOWS_STATUS_URL") },
    { label: l.privacy, href: getLink("OPENFLOWS_PRIVACY_URL") },
    { label: l.terms, href: getLink("OPENFLOWS_TERMS_URL") },
  ].filter((l): l is { label: string; href: string } => !!l.href);

  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(0,1.35fr)_minmax(26rem,1fr)]">
      {/* Brand panel: globe background, copy centred over it. */}
      <section data-theme="dark" className="relative isolate hidden min-h-screen flex-col overflow-hidden border-r border-border bg-[#040605] text-foreground lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-25 [mask-image:radial-gradient(ellipse_at_62%_50%,black,transparent_70%)]" />
        <div className="absolute inset-0 -z-10 animate-fade">
          <WorldGlobe x={0.66} y={0.5} size={0.4} />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-[60%] bg-gradient-to-r from-[#040605] via-[#040605]/80 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-[#040605] to-transparent" />

        <header className="pointer-events-none flex items-center justify-between px-12 pt-10">
          <span className="flex items-center gap-3 text-[17px] font-semibold tracking-tight">
            <Logo size={32} className="rounded-lg" /> OpenFlows
          </span>
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-muted backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            {l.agentsAtWork}
          </span>
        </header>

        <div className="pointer-events-none flex flex-1 items-center px-12">
          <div className="max-w-lg">
            <div className="animate-enter">
              <p className="inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-medium text-accent backdrop-blur">
                {l.badge}
              </p>
              <h2 className="mt-5 text-[2.75rem] font-semibold leading-[1.06] tracking-tight">
                {l.headline}{" "}
                <span className="bg-gradient-to-r from-[#9be3c3] to-accent bg-clip-text text-transparent">{l.headlineAccent}</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted">
                {l.lede}
              </p>
            </div>
            <ul className="mt-10 space-y-4">
              {points.map((p, i) => (
                <li key={p.title} className="flex animate-enter gap-4" style={{ animationDelay: `${120 + i * 70}ms` }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-accent backdrop-blur">
                    <p.icon size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="pointer-events-none flex justify-end px-12 pb-8 text-xs text-subtle">
          <span>{l.dragGlobe}</span>
        </footer>
      </section>

      {/* Sign-in panel */}
      <section className="relative flex min-h-screen flex-col px-6 py-10 sm:px-12">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/[0.05] blur-3xl" />

        <div className="relative flex items-center justify-between gap-3">
          <span className="flex items-center gap-3 text-[17px] font-semibold tracking-tight lg:invisible">
            <Logo size={32} className="rounded-lg" /> OpenFlows
          </span>
          <PrefsSwitch />
        </div>

        <div className="relative m-auto w-full max-w-[360px] animate-enter py-10">
          <Logo size={40} className="mb-8 rounded-xl shadow-lg shadow-accent/10" />
          <h1 className="text-2xl font-semibold tracking-tight">{l.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{l.subtitle}</p>

          {message ? (
            <p role="alert" className="mt-6 flex animate-pop items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <IconAlert size={16} className="mt-0.5" /> {message}
            </p>
          ) : null}

          <GithubSignInButton href="/auth/github/start?next=%2F" label={l.continueGithub} redirectingLabel={l.redirecting} className="mt-8 h-11 w-full text-[15px]" />

          {support ? (
            <p className="mt-4 text-center text-[13px] text-muted">
              <a href={support} className="underline-offset-4 transition-colors hover:text-foreground hover:underline">{l.needHelp}</a>
            </p>
          ) : null}

          <ul className="mt-8 space-y-2.5 border-t border-border pt-6">
            {[l.trust1, l.trust2, l.trust3].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[13px] text-muted">
                <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6.5" /><path d="m5.3 8.2 1.8 1.8 3.6-3.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-8 text-xs leading-relaxed text-subtle">
            {l.footnote}
          </p>
        </div>

        <footer className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-subtle">
          <span>© OpenFlows · v{version}</span>
          {links.length ? (
            <nav aria-label={l.legal} className="flex flex-wrap gap-x-5 gap-y-1">
              {links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">{l.label}</a>
              ))}
            </nav>
          ) : null}
        </footer>
      </section>
    </main>
  );
}
