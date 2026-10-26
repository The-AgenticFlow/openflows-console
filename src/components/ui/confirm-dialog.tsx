// ConfirmDialog: accessible confirmation built on the native <dialog> element
// (focus is trapped and Escape closes it by the platform). For destructive
// actions `requireText` forces the user to type a name before the confirm
// button enables, so a stray click cannot delete anything.
"use client";

import { useEffect, useRef, useState } from "react";

import type { ConsoleError } from "@/lib/client/api";

import { Button } from "./button";
import { ErrorNotice } from "./primitives";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  requireText,
  pending,
  error,
  onConfirm,
  onClose,
}: Readonly<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  requireText?: string;
  pending: boolean;
  error: ConsoleError | null;
  onConfirm: (typed: string) => void;
  onClose: () => void;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const ready = !requireText || typed === requireText;

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      onClose={() => { setTyped(""); onClose(); }}
      onCancel={(e) => { if (pending) e.preventDefault(); }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/70"
    >
      <form
        method="dialog"
        onSubmit={(e) => { e.preventDefault(); if (ready && !pending) onConfirm(typed); }}
        className="space-y-4 p-6"
      >
        <div>
          <h2 id="confirm-title" className="text-base font-semibold">{title}</h2>
          <p id="confirm-desc" className="mt-1.5 text-sm text-muted">{description}</p>
        </div>
        {requireText ? (
          <div>
            <label htmlFor="confirm-text" className="mb-1.5 block text-sm font-medium">
              Type <span className="font-mono">{requireText}</span> to confirm
            </label>
            <input
              id="confirm-text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 font-mono text-sm"
            />
          </div>
        ) : null}
        {error ? <ErrorNotice error={error} /> : null}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" variant={danger ? "danger" : "primary"} loading={pending} disabled={!ready}>{confirmLabel}</Button>
        </div>
      </form>
    </dialog>
  );
}
