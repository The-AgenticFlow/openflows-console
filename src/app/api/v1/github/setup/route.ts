// GET /api/v1/github/setup: GitHub App installation (setup URL) leg.
import { completeGithubLeg } from "@/lib/server/github-callback";

export function GET(req: Request) {
  return completeGithubLeg(req, "/api/v1/github/setup");
}
