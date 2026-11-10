// Proxy (Next 16 middleware). Next requires this file at src/proxy.ts with a
// static `config`; the policy (session redirect, Manager forwarding) lives in
// lib/server/proxy-policy.ts so this file stays small.
import { routeRequest } from "@/lib/server/proxy-policy";

export const proxy = routeRequest;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};
