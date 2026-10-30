// HelpCenter: the searchable body of the Help page. Sections: quick start
// (numbered cards), concepts (glossary), roles and permissions (a matrix that
// mirrors Manager policy; Manager remains the authority), troubleshooting
// (expandable answers), keyboard tips and a support card. The search box
// filters every section client-side; nothing is fetched. Docs and support
// links appear only when the operator configured them (passed in by the page).
"use client";

import Link from "next/link";
import { useState } from "react";

import { useT } from "@/lib/preferences/client";

import { useConsole } from "./shell/console-context";
import { IconArrowRight, IconBook, IconCheck, IconKeyboard, IconMail, IconSparkles, IconX } from "./ui/icons";
import { Card, CardHeader, SearchInput } from "./ui/primitives";

const match = (q: string, ...parts: string[]) => !q || parts.some((p) => p.toLowerCase().includes(q));

export function HelpCenter({ docsUrl, supportUrl }: Readonly<{ docsUrl?: string; supportUrl?: string }>) {
  const { t } = useT();
  const { org } = useConsole();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const h = t.help;

  const stepLinks = [`/o/${org.slug}`, `/o/${org.slug}/github`, `/o/${org.slug}/account`, `/o/${org.slug}/tenants/new`];
  const steps = h.steps.map((s, i) => ({ s, href: stepLinks[i], n: i + 1 })).filter(({ s }) => match(q, ...s));
  const terms = h.terms.filter((r) => match(q, ...r));
  const caps = h.caps.filter((r) => match(q, r[0]));
  const fixes = h.fixes.filter((r) => match(q, ...r));
  const keys = h.shortcutsList.filter((r) => match(q, ...r));
  const empty = !steps.length && !terms.length && !caps.length && !fixes.length && !keys.length;

  return (
    <div className="space-y-6">
      <div className="flex animate-enter items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder={h.searchPlaceholder} label={t.common.search} />
      </div>

      {empty ? <Card><p className="px-5 py-10 text-center text-sm text-muted">{h.noResults}</p></Card> : null}

      {steps.length ? (
        <section className="animate-enter">
          <h2 className="mb-1 text-sm font-semibold">{h.quickStart}</h2>
          <p className="mb-4 text-sm text-muted">{h.quickStartBody}</p>
          <ol className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map(({ s: [title, body], href, n }, i) => (
              <li key={title} style={{ "--i": i } as React.CSSProperties}>
                <Link href={href} className="group flex h-full flex-col rounded-xl border border-border bg-surface p-4 shadow-sm shadow-shadow transition-all hover:-translate-y-0.5 hover:border-border-strong">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-sm font-semibold text-accent">{n}</span>
                  <p className="mt-3 text-sm font-medium">{title}</p>
                  <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{body}</p>
                  <IconArrowRight size={14} className="mt-3 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {terms.length ? (
          <Card>
            <CardHeader title={h.concepts} icon={<IconBook size={15} />} />
            <dl className="divide-y divide-border">
              {terms.map(([term, text]) => (
                <div key={term} className="px-5 py-3">
                  <dt className="text-sm font-medium">{term}</dt>
                  <dd className="mt-0.5 text-sm text-muted">{text}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ) : null}

        {fixes.length ? (
          <Card>
            <CardHeader title={h.troubleshooting} description={h.troubleshootingBody} icon={<IconSparkles size={15} />} />
            <div className="divide-y divide-border">
              {fixes.map(([question, answer]) => (
                <details key={question} className="group px-5 py-3" open={!!q}>
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-medium marker:hidden">
                    {question}
                    <span aria-hidden className="mt-0.5 text-subtle transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{answer}</p>
                </details>
              ))}
            </div>
          </Card>
        ) : null}
      </div>

      {caps.length ? (
        <Card>
          <CardHeader title={h.permissions} description={h.permissionsBody} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">{h.capability}</th>
                  <th className="px-3 py-3 text-center font-medium">{t.roles.admin}</th>
                  <th className="px-3 py-3 text-center font-medium">{t.roles.developer}</th>
                  <th className="px-5 py-3 text-center font-medium">{t.roles.viewer}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {caps.map(([label, ...allowed]) => (
                  <tr key={label} className="transition-colors hover:bg-hover">
                    <td className="px-5 py-3">{label}</td>
                    {allowed.map((ok, i) => (
                      <td key={i} className="px-3 py-3 text-center">
                        {ok ? <IconCheck size={16} className="mx-auto text-accent" /> : <IconX size={14} className="mx-auto text-subtle" />}
                        <span className="sr-only">{ok ? t.common.yes : t.common.no}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {keys.length ? (
          <Card>
            <CardHeader title={h.shortcuts} icon={<IconKeyboard size={15} />} />
            <ul className="divide-y divide-border">
              {keys.map(([k, what]) => (
                <li key={k} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <span className="text-muted">{what}</span>
                  <kbd className="rounded-md border border-border-strong bg-surface-muted px-2 py-0.5 font-mono text-xs">{k}</kbd>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><IconMail size={18} /></span>
            <h2 className="mt-4 text-base font-semibold">{h.support}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{h.supportBody}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {supportUrl ? <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-on-primary hover:bg-primary-hover"><IconMail size={15} /> {h.contact}</a> : null}
              {docsUrl ? <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong px-3.5 text-sm font-medium hover:bg-surface-muted"><IconBook size={15} /> {h.docs}</a> : null}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
