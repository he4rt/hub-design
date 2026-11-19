import { Link } from 'react-router'
import './brand-mark.css'

/**
 * The He4rt Hub wordmark: the square with the 4 and the name in Space Grotesk. `ink` sits on the
 * sidebar; `light` on a topbar over the page.
 */
export function BrandMark({
  to,
  name = 'He4rt Hub',
  tagline,
  tone = 'light',
}: {
  to: string
  name?: string
  tagline?: string
  tone?: 'ink' | 'light'
}) {
  return (
    <Link to={to} className="brand-mark" data-tone={tone} title={name}>
      <span className="brand-mark__four" aria-hidden>
        4
      </span>
      <span className="brand-mark__text">
        <span className="brand-mark__name">{name}</span>
        {tagline && <span className="brand-mark__tagline">{tagline}</span>}
      </span>
    </Link>
  )
}
