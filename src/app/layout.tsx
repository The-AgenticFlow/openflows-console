// Root layout: global styles, Inter + JetBrains Mono fonts, TanStack Query
// providers. Deliberately renders no chrome: the signed-in shell lives in
// `o/[slug]/layout.tsx` and public pages (login) render bare.
import "./globals.css";

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "@/lib/providers";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "OpenFlows Console", template: "%s · OpenFlows Console" },
  description: "Manage your OpenFlows organisations, GitHub connections and tenants.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
