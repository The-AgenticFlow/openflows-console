// Toasts: short "done" / "failed" confirmations after an action, shown in the
// bottom-right corner and dismissed automatically after a few seconds (or by
// the close button). They complement, never replace, the inline result on the
// page: errors that need reading or acting on stay in the page itself.
// Announced politely to screen readers through an aria-live region. Callers
// pass already-translated text, so this module holds no copy of its own apart
// from the close label.
"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";

import { IconAlert, IconCheck, IconInfo, IconX } from "./icons";

type Kind = "success" | "error" | "info";
interface Toast { id: number; kind: Kind; title: string; body?: string }
interface ToastApi { show: (t: Omit<Toast, "id">) => void }

const Ctx = createContext<ToastApi | null>(null);
const TTL = 4500;

const STYLE: Record<Kind, { icon: typeof IconCheck; chip: string }> = {
  success: { icon: IconCheck, chip: "bg-success-soft text-success" },
  error: { icon: IconAlert, chip: "bg-danger-soft text-danger" },
  info: { icon: IconInfo, chip: "bg-info-soft text-info" },
};

export function ToastProvider({ children, closeLabel = "Dismiss" }: Readonly<{ children: ReactNode; closeLabel?: string }>) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = next.current++;
    setToasts((all) => [...all.slice(-3), { ...t, id }]);
    window.setTimeout(() => dismiss(id), TTL);
  }, [dismiss]);
  const api = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => {
          const { icon: Icon, chip } = STYLE[t.kind];
          return (
            <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className="pointer-events-auto flex animate-pop items-start gap-3 rounded-xl border border-border-strong bg-surface-raised p-3.5 shadow-2xl shadow-shadow">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${chip}`}><Icon size={14} /></span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium">{t.title}</p>
                {t.body ? <p className="mt-0.5 text-xs text-muted">{t.body}</p> : null}
              </div>
              <button type="button" aria-label={closeLabel} onClick={() => dismiss(t.id)} className="rounded-md p-1 text-subtle transition-colors hover:bg-hover hover:text-foreground">
                <IconX size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

/** Show a toast. Safe to call outside the provider (it then does nothing). */
export function useToast(): ToastApi {
  return useContext(Ctx) ?? { show: () => {} };
}
