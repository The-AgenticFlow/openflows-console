// Next.js startup hook that validates real-mode OpenFlows configuration before
// the server accepts requests. Mock mode requires no environment variables.
export async function register() {
  const { validateEnv } = await import("./lib/config/env");
  validateEnv();
}
