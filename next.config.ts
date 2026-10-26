import type { NextConfig } from "next";

// The Console reaches OpenFlows Manager through this same-origin proxy so the
// browser holds Manager's own session + CSRF cookies on the Console's origin
// (the GitHub OAuth callback registered for the OpenFlows App is a Console URL).
// `OPENFLOWS_MANAGER_URL` is read here at build/start time because rewrites are
// resolved before the app's `getEnv()` module can run.
const manager = process.env.OPENFLOWS_MANAGER_URL ?? "http://127.0.0.1:3002";

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

const nextConfig: NextConfig = {
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
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${manager}/api/v1/:path*` },
      { source: "/auth/:path*", destination: `${manager}/auth/:path*` },
      { source: "/invitations/accept", destination: `${manager}/invitations/accept` },
    ];
  },
};

export default nextConfig;
