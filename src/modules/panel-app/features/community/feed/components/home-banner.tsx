import { Link } from 'react-router'
import { useDb } from '@/mocks/db'
import './home-banner.css'

/**
 * Strip at the top of the home with the newest active banner: a notice of the community or a
 * partner's announcement, always labeled so nobody mistakes an ad for a notice.
 */
export function HomeBanner() {
  const banners = useDb((state) => state.homeBanners)
  const banner = banners.filter((b) => b.active).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  if (!banner) return null

  const external = banner.link && /^https?:/.test(banner.link.url)
  return (
    <aside className="home-banner" data-kind={banner.kind} aria-label="Avisos">
      <span className="home-banner__label">
        {banner.kind === 'partner' ? `Parceiro · ${banner.partner ?? ''}` : 'Aviso da comunidade'}
      </span>
      <p className="home-banner__text" title={banner.text}>
        {banner.text}
      </p>
      {banner.link &&
        (external ? (
          <a className="home-banner__link" href={banner.link.url} target="_blank" rel="noopener noreferrer sponsored">
            {banner.link.label}
          </a>
        ) : (
          <Link className="home-banner__link" to={banner.link.url}>
            {banner.link.label}
          </Link>
        ))}
    </aside>
  )
}
