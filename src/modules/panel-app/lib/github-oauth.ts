/** Starts the real GitHub sign-in (server/github.ts): GitHub asks the member, then sends them back to `redirect`. */
export function githubOAuthUrl(mode: 'login' | 'link', redirect: string): string {
  return `/api/github/oauth/start?mode=${mode}&redirect=${encodeURIComponent(redirect)}`
}
