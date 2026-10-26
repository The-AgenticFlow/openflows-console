// GET /api/v1/github/oauth/callback: GitHub user-authorisation leg. Handled
// here (ahead of the generic Manager rewrite) so the user lands on the Console.
import { completeGithubLeg } from "@/lib/server/github-callback";

export function GET(req: Request) {
  return completeGithubLeg(req, "/api/v1/github/oauth/callback");
}
