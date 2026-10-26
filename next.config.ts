import type { NextConfig } from "next";

// The Console reaches OpenFlows Manager through this same-origin proxy so the
// browser holds Manager's own session + CSRF cookies on the Console's origin
// (the GitHub OAuth callback registered for the OpenFlows App is a Console URL).
// `OPENFLOWS_MANAGER_URL` is read here at build/start time because rewrites are
// resolved before the app's `getEnv()` module can run.
const manager = process.env.OPENFLOWS_MANAGER_URL ?? "http://127.0.0.1:3002";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false, // hide the Next.js dev badge; it overlaps the sidebar footer
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${manager}/api/v1/:path*` },
      { source: "/auth/:path*", destination: `${manager}/auth/:path*` },
      { source: "/invitations/accept", destination: `${manager}/invitations/accept` },
    ];
  },
};

export default nextConfig;
