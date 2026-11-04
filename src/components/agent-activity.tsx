// AgentActivityCard: what a tenant's agents are doing, one row per managed
// agent chat (role + ticket + status), from Manager's agent-activity endpoint.
// A failed chat shows a translated, actionable explanation chosen from the
// stable `error_code`; the AI provider's raw error text never reaches the
// Console (it can contain account identifiers). The card hides itself if the
// Manager does not offer the endpoint, so an older Manager shows nothing
// rather than an error. The bell raises its alert from the same data (`failedAgentChats` in contract.ts).
"use client";

import { useAgentActivity } from "@/lib/client/queries";
import { relativeTime } from "@/lib/i18n";
import { useT } from "@/lib/preferences/client";

import { useConsole } from "./shell/console-context";
import { IconAlert, IconGithub, IconTerminal } from "./ui/icons";
import { Badge, Card, CardHeader, EmptyState, Skeleton, type Tone } from "./ui/primitives";

const TONE: Record<string, Tone> = {
  running: "info",
  pending: "neutral",
  waiting: "neutral",
  requires_action: "warning",
  completed: "success",
  error: "danger",
  gone: "neutral",
  unknown: "neutral",
};

export function AgentActivityCard({ tenantId, repoName }: Readonly<{ tenantId: string; repoName?: string }>) {
  const { orgId } = useConsole();
  const { t, locale } = useT();
  const a = t.agents;
  const q = useAgentActivity(orgId, tenantId, true);

  if (q.error) return null;
  return (
    <Card>
      <CardHeader title={a.title} description={a.body} icon={<IconTerminal size={15} />} />
      {q.isPending ? (
        <div className="p-5"><Skeleton className="h-12 rounded-lg" /></div>
      ) : q.data.chats.length === 0 ? (
        <EmptyState title={a.emptyTitle} description={a.empty} />
      ) : (
        <ul className="divide-y divide-border">
          {q.data.chats.map((c) => (
            <li key={`${c.ticket_id}-${c.started_at}-${c.role}`} className="space-y-1.5 px-5 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{a.roles[c.role] ?? c.role}</span>
                  <span className="font-mono text-xs text-muted">{c.ticket_id}</span>
                </span>
                <Badge dot live={c.status === "running"} tone={TONE[c.status] ?? "neutral"}>{a.status[c.status] ?? c.status}</Badge>
              </div>
              <p className="text-xs text-muted">
                {c.updated_at ? a.updated(relativeTime(c.updated_at, locale, t)) : a.started(relativeTime(c.started_at, locale, t))}
              </p>
              {c.error_code ? (
                <p className="flex items-start gap-2 text-[13px] leading-relaxed text-danger" role="alert">
                  <IconAlert size={14} className="mt-0.5 shrink-0" />
                  <span>{a.errors[c.error_code] ?? a.errors.AGENT_ERROR}</span>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {repoName ? (
        <div className="border-t border-border px-5 py-3">
          <a href={`https://github.com/${repoName}/pulls`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] hover:underline">
            <IconGithub size={14} /> {a.viewPulls}
          </a>
        </div>
      ) : null}
    </Card>
  );
}
