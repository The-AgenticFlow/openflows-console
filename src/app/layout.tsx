// Root layout: global styles, Inter + JetBrains Mono fonts, TanStack Query
// providers, and the visitor's language and theme (read from cookies so the
// first render is already in the right language and colours, with no flash).
// Deliberately renders no chrome: the signed-in shell lives in
// `o/[slug]/layout.tsx` and public pages (login) render bare.
import "./globals.css";

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { getLocale } from "@/lib/i18n/server";
import { PreferencesProvider } from "@/lib/preferences/client";
import { parseTheme, THEME_COOKIE } from "@/lib/preferences/theme";
import { Providers } from "@/lib/providers";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "OpenFlows Console", template: "%s · OpenFlows Console" },
  description: "Manage your OpenFlows organisations, GitHub connections and tenants.",
  icons: { icon: "/logo.png" },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, jar] = await Promise.all([getLocale(), cookies()]);
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);
  return (
    <html lang={locale} data-theme={theme === "system" ? undefined : theme} className={`${inter.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <Providers>
          <PreferencesProvider locale={locale} theme={theme}>{children}</PreferencesProvider>
        </Providers>
      </body>
    </html>
  );
}
