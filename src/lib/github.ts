/** GitHub organization where squads work. `VITE_GITHUB_ORG` points the Hub at a test organization. */
export const GITHUB_ORG: string = import.meta.env.VITE_GITHUB_ORG ?? 'he4rt'

/** Repository where members open the entry test pull request. */
export const ENTRY_TEST_REPOSITORY = `${GITHUB_ORG}/primeiro-commit`
