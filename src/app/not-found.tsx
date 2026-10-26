// Global 404: also what a user sees for another organisation's slug (Manager
// scoping means we never confirm it exists).
import Link from "next/link";

import { buttonClass } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo size={44} className="mb-6 rounded-xl" />
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted">It may have been removed, or you may not have access to it.</p>
      <Link href="/" className={`${buttonClass("primary")} mt-6`}>Back to Console</Link>
    </main>
  );
}
