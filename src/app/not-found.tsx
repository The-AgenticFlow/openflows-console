// Global 404: also what a user sees for another organisation's slug (Manager
// scoping means we never confirm it exists). Text follows the visitor's
// language.
import Link from "next/link";

import { buttonClass } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { getMessages } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getMessages();
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl" />
      <div className="relative flex animate-enter flex-col items-center">
      <Logo size={44} className="mb-6 rounded-xl" />
      <h1 className="text-2xl font-semibold tracking-tight">{t.pages.notFound}</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{t.pages.notFoundBody}</p>
      <Link href="/" className={`${buttonClass("primary")} mt-6`}>{t.pages.backConsole}</Link>
      </div>
    </main>
  );
}
