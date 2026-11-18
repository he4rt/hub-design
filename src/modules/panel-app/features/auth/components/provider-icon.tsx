import { siDiscord, siGithub, siGoogle } from 'simple-icons'
import type { SocialProvider } from '@/mocks/db'

const ICONS = { discord: siDiscord, github: siGithub, google: siGoogle }

/** Monochrome brand mark; it takes the text color. */
export function ProviderIcon({ provider }: { provider: SocialProvider }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d={ICONS[provider].path} />
    </svg>
  )
}
