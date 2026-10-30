// SettingsPanel: organisation settings in two-column sections: General (name,
// read-only URL name), Identifiers (organisation ID, status, your role, for
// support), a pointer to personal settings (theme, language and the Coder
// account now live on the Account page, because they belong to the person, not
// the organisation), and the danger zone (delete organisation, admin only,
// typed confirmation). All text follows the active language.
"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, type ConsoleError } from "@/lib/client/api";
import { canAdminister, slugify } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { useConsole } from "./shell/console-context";
import { Button, LinkButton } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { IconUser } from "./ui/icons";
import { Badge, ErrorNotice, Field, inputClass, SettingsSection } from "./ui/primitives";

function nameProblem(name: string): "orgNameShort" | "orgNameLong" | "orgNameChars" | null {
  const v = name.trim();
  if (v.length < 2) return "orgNameShort";
  if (v.length > 60) return "orgNameLong";
  if (!slugify(v)) return "orgNameChars";
  return null;
}

export function SettingsPanel() {
  const { org, orgId, role } = useConsole();
  const { t } = useT();
  const admin = canAdminister(role);
  const router = useRouter();
  const [name, setName] = useState(org.display_name);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const problem = nameProblem(name);

  const rename = useMutation({ mutationFn: () => api.updateOrganization(orgId, name.trim()), onSuccess: () => { setSaved(true); router.refresh(); } });
  const del = useMutation({ mutationFn: () => api.deleteOrganization(orgId), onSuccess: () => { setConfirm(false); router.push("/"); router.refresh(); } });
  const statusTone = org.status === "ready" || org.status === "active" ? "success" : org.status === "provisioning" ? "info" : "warning";

  return (
    <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); setSaved(false); if (!problem) rename.mutate(); }} noValidate>
        <SettingsSection
          title={t.settings.general}
          description={t.settings.generalBody}
          footer={admin ? (
            <>
              {saved ? <span role="status" className="mr-auto text-sm text-success">{t.common.saved}</span> : null}
              <Button type="submit" variant="primary" loading={rename.isPending} disabled={!!problem || name.trim() === org.display_name}>{t.common.save}</Button>
            </>
          ) : <span className="mr-auto text-xs text-muted">{t.settings.adminsOnly}</span>}
        >
          <div className="max-w-md space-y-5">
            <div>
              <label htmlFor="org-display" className="mb-1.5 block text-sm font-medium">{t.settings.name}</label>
              <input id="org-display" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} disabled={!admin} aria-invalid={!!problem} className={inputClass} />
              {problem ? <p className="mt-1 text-xs text-danger">{t.validation[problem]}</p> : null}
            </div>
            <div>
              <label htmlFor="org-slug" className="mb-1.5 block text-sm font-medium">{t.settings.urlName}</label>
              <div className="flex h-10 items-center overflow-hidden rounded-lg border border-border bg-surface-muted text-sm">
                <span className="border-r border-border px-3 text-subtle">/o/</span>
                <input id="org-slug" readOnly value={org.slug} className="h-full flex-1 bg-transparent px-3 font-mono text-[13px] text-muted outline-none" />
              </div>
              <p className="mt-1.5 text-xs text-muted">{t.settings.urlNameHint}</p>
            </div>
          </div>
          {rename.error ? <div className="mt-4"><ErrorNotice error={rename.error as ConsoleError} /></div> : null}
        </SettingsSection>
      </form>

      <SettingsSection title={t.settings.identifiers} description={t.settings.identifiersBody}>
        <dl className="divide-y divide-border">
          <Field label={t.settings.orgId} copy={org.organization_id} mono>{org.organization_id}</Field>
          <Field label={t.settings.status}><Badge dot tone={statusTone}>{t.states[org.status] ?? org.status}</Badge></Field>
          <Field label={t.settings.yourRole}><Badge tone={role === "admin" ? "info" : "neutral"}>{t.roles[role]}</Badge></Field>
        </dl>
      </SettingsSection>

      <SettingsSection title={t.settings.personal} description={t.settings.personalBody}>
        <LinkButton href={`/o/${org.slug}/account`}><IconUser size={15} /> {t.settings.openAccount}</LinkButton>
      </SettingsSection>

      {admin ? (
        <SettingsSection danger title={t.settings.danger} description={t.settings.dangerBody}>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-danger/20 bg-danger-soft/50 p-4">
            <div>
              <p className="text-sm font-medium">{t.settings.deleteTitle}</p>
              <p className="text-sm text-muted">{t.settings.deleteBody}</p>
            </div>
            <Button variant="danger" onClick={() => { del.reset(); setConfirm(true); }}>{t.settings.deleteButton}</Button>
          </div>
        </SettingsSection>
      ) : null}

      <ConfirmDialog
        open={confirm}
        title={t.settings.deleteConfirmTitle}
        description={t.settings.deleteConfirmBody}
        confirmLabel={t.settings.deleteButton}
        danger
        requireText={org.slug}
        pending={del.isPending}
        error={del.error as ConsoleError | null}
        onClose={() => { setConfirm(false); del.reset(); }}
        onConfirm={() => del.mutate()}
      />
    </div>
  );
}
