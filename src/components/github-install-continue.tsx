// GithubInstallContinue: second leg of Manager's GitHub connect flow. Manager's
// `connect` returns two URLs: the user-authorisation URL (identity) and the app
// installation URL (`setup_url`, where the user picks account + repositories).
// The first leg ends back on the Console, so the installation URL is parked in
// sessionStorage before leaving (`rememberSetupUrl`) and followed here. It is a
// one-time, per-tab value; if it is gone (new tab, expired) the user restarts
// from the GitHub page. The URL carries Manager's signed state, never a secret
// the Console could abuse: it only ever points at github.com. Text follows the
// active language.
"use client";

import { useEffect, useSyncExternalStore } from "react";

import { useT } from "@/lib/preferences/client";

import { Button } from "./ui/button";

const KEY = "of_github_setup_url";

export function rememberSetupUrl(url: string | null): void {
  try {
    if (url) sessionStorage.setItem(KEY, url);
  } catch {
    // Storage blocked: the user can restart from the GitHub page.
  }
}

function peekSetupUrl(): string | null {
  try {
    const url = sessionStorage.getItem(KEY);
    return url?.startsWith("https://github.com/") ? url : null;
  } catch {
    return null;
  }
}

const noopSubscribe = () => () => {};

export function GithubInstallContinue({ githubHref }: Readonly<{ githubHref: string }>) {
  const { t } = useT();
  // undefined on the server and during hydration (renders nothing, no mismatch);
  // then the stored URL, or null when it is gone.
  const url = useSyncExternalStore(noopSubscribe, peekSetupUrl, () => undefined);

  useEffect(() => {
    if (!url) return;
    try {
      sessionStorage.removeItem(KEY); // one-time: a reload must not loop back to GitHub
    } catch {}
    window.location.assign(url);
  }, [url]);

  if (url === undefined) return null;
  if (url) {
    return <p role="status" className="mb-4 rounded-lg bg-info-soft px-4 py-3 text-sm text-info">{t.github.continuing}</p>;
  }
  return (
    <div role="status" className="mb-4 flex items-center justify-between gap-4 rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
      <span>{t.github.notInstalled}</span>
      <Button variant="primary" onClick={() => window.location.assign(githubHref)}>{t.github.connect}</Button>
    </div>
  );
}
