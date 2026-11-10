import type { NextConfig } from "next";

// The Console reaches OpenFlows Manager through this same-origin proxy so the
// browser holds Manager's own session + CSRF cookies on the Console's origin
// (the GitHub OAuth callback registered for the OpenFlows App is a Console URL).
// The proxy itself lives in src/proxy.ts and reads `OPENFLOWS_MANAGER_URL` at
// request time. It is not a next.config rewrite: rewrites are baked in at build
// time, so a prebuilt image could not be pointed at a Manager when it starts.

// Baseline browser hardening. The Console renders no third-party content and
// only talks to its own origin (Manager is proxied), so the policy is strict.
// Next needs inline scripts/styles for hydration; dev also needs eval for HMR.
const dev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://github.com",
].join("; ");

// End-to-end tests build into their own directory so they never clash with a
// running `pnpm dev` (see playwright.config.ts). Unset in normal use.
const distDir = process.env.NEXT_DIST_DIR || ".next";

const nextConfig: NextConfig = {
  distDir,
  output: "standalone",
  devIndicators: false, // hide the Next.js dev badge; it overlaps the sidebar footer
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
