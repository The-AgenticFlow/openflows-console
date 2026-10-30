// GuidedTour: first-run walkthrough of the Console shell. Highlights the real
// navigation items (elements tagged `data-tour="<id>"`) one at a time with a
// short explanation, a spotlight and Back / Next / Skip controls. It starts
// once automatically for a new browser (completion is remembered in
// localStorage) and can be replayed through `startTour()` (Help page, sidebar).
// Steps whose target is not on screen (for example the sidebar on a phone, or a
// button hidden by role) are skipped, so the tour never points at nothing.
// Purely presentational: no Manager calls, no data. Keyboard: Esc skips,
// arrow keys move, focus moves into the dialog and returns when it closes.
// Step text follows the active language.
"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useT } from "@/lib/preferences/client";

import { Button } from "./ui/button";

const DONE_KEY = "of_tour_v1_done";
const START_EVENT = "of:start-tour";

interface Step { target: string }

const STEPS: Step[] = ["overview", "tenants", "new-tenant", "activity", "github", "members", "settings", "help"].map((target) => ({ target }));

function isDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return true; // storage blocked: do not nag on every page load
  }
}

function markDone(): void {
  try {
    localStorage.setItem(DONE_KEY, "1");
  } catch {
    // Not remembered; the tour can be skipped again.
  }
}

/** Ask the mounted tour to start (used by the Help page and sidebar). */
export function startTour(): void {
  window.dispatchEvent(new Event(START_EVENT));
}

function targetEl(id: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${id}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;
}

export function GuidedTour() {
  const { t } = useT();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const begin = useCallback(() => {
    const visible = STEPS.filter((s) => targetEl(s.target));
    if (visible.length === 0) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    setIndex(0);
    setSteps(visible);
  }, []);

  const finish = useCallback(() => {
    markDone();
    setSteps(null);
    returnFocus.current?.focus?.();
  }, []);

  // Replay requests, and one automatic start for a first-time visitor.
  useEffect(() => {
    window.addEventListener(START_EVENT, begin);
    const auto = isDone() ? null : window.setTimeout(begin, 800);
    return () => {
      window.removeEventListener(START_EVENT, begin);
      if (auto) window.clearTimeout(auto);
    };
  }, [begin]);

  const step = steps?.[index];

  // Keep the spotlight on the target through scrolling and resizing.
  useLayoutEffect(() => {
    if (!step) return;
    const measure = () => setRect(targetEl(step.target)?.getBoundingClientRect() ?? null);
    targetEl(step.target)?.scrollIntoView({ block: "nearest" });
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step]);

  useEffect(() => {
    if (step) dialogRef.current?.querySelector<HTMLButtonElement>("[data-next]")?.focus();
  }, [step]);

  useEffect(() => {
    if (!steps) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, steps.length - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steps, finish]);

  if (!steps || !step || !rect) return null;
  const last = index === steps.length - 1;
  const pad = 6;
  const popWidth = 320;
  // Sidebar targets get the card to their right; others get it below.
  const beside = rect.left < 300;
  const left = beside ? rect.right + 16 : Math.min(Math.max(12, rect.right - popWidth), window.innerWidth - popWidth - 12);
  const top = beside ? Math.max(12, Math.min(rect.top - 8, window.innerHeight - 220)) : rect.bottom + 14;

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-lg ring-2 ring-accent"
        style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px var(--overlay)" }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="absolute animate-pop rounded-xl border border-border-strong bg-surface p-4 shadow-2xl shadow-shadow"
        style={{ left, top, width: popWidth }}
      >
        <p className="text-xs text-muted">{t.tour.stepOf(index + 1, steps.length)}</p>
        <h2 id="tour-title" className="mt-1 text-sm font-semibold">{t.tour.steps[step.target]?.[0]}</h2>
        <p id="tour-body" className="mt-1 text-sm text-muted">{t.tour.steps[step.target]?.[1]}</p>
        <div aria-hidden className="mt-3 flex gap-1">{steps.map((s, i) => <span key={s.target} className={`h-1 flex-1 rounded-full ${i <= index ? "bg-accent" : "bg-surface-muted"}`} />)}</div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={finish}>{last ? t.common.close : t.tour.skip}</Button>
          <div className="flex gap-2">
            {index > 0 ? <Button onClick={() => setIndex(index - 1)}>{t.common.back}</Button> : null}
            <Button data-next variant="primary" onClick={() => (last ? finish() : setIndex(index + 1))}>{last ? t.common.done : t.common.next}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** "Take the tour" control for static pages (the Help page is a server component). */
export function TourButton() {
  const { t } = useT();
  return <Button onClick={startTour}>{t.help.takeTour}</Button>;
}
