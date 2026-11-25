import { Link } from 'react-router'
import { CalendarDays, Check, Eye, Globe, LayoutGrid, MapPin, Pencil, BadgeCheck } from 'lucide-react'
import { siDevdotto, siGithub, siGitlab, siX } from 'simple-icons'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatMonth } from '@/lib/dates'
import { viewerOptions, type Viewer } from '@/lib/trajectory/visibility'
import { CoverArt, CoverControls, PhotoControl } from './profile-cover'
import { ShareProfileButton } from './share-profile-button'
import './profile-header.css'

/**
 * Identity card, aligned left: the cover band on top, the avatar over its lower edge with the actions
 * as quiet icons on the right, the name in display, one line of what
 * the member does, then facts and links as quiet icons. Squads live in the trajectory; achievements
 * in the side column. A validator gets the Feed's mark and a plain line, in the text color. No counters, level, or follow button.
 */
export function ProfileHeader({
  userId,
  name,
  username,
  headline,
  photoUrl,
  links,
  portfolioUrl,
  viewAs,
  validator,
  isOwner,
  memberSince,
  state,
  coverImageUrl,
}: {
  userId: string
  name: string
  username: string
  /** One line: the current role, or the areas. The member's own text lives in Sobre. */
  headline: string
  photoUrl: string | null
  links: { label: string; url: string }[]
  /** Its own mark, whatever site it is on: a portfolio on GitHub is still the portfolio. */
  portfolioUrl: string
  /** Only for the profile's owner, who may read it as a member or a visitor would. */
  viewAs: { viewer: Viewer; onChange: (viewer: Viewer) => void } | null
  /** From the validators the administration enabled; role and company only when the validator allowed. */
  validator: { since: string; role: string | null; company: string | null } | null
  isOwner: boolean
  /** When the account was created in the Hub; it does not know how long someone has been in He4rt. */
  memberSince: string
  /** UF of the city in the member's account; only the state shows, never the city. */
  state: string | null
  coverImageUrl: string | null
}) {
  const validatorDetail = validator && [validator.role, validator.company].filter(Boolean).join(', ')

  return (
    <Card className="profile-header" data-validator={validator ? '' : undefined}>
      <CoverArt imageUrl={coverImageUrl} />
      {isOwner && <CoverControls userId={userId} imageUrl={coverImageUrl} />}
      <div className="profile-header__top">
      <span className="profile-header__photo">
        <Avatar src={photoUrl} name={name} size="xl" className="profile-header__avatar" />
        {isOwner && <PhotoControl userId={userId} />}
      </span>
      <div className="profile-header__actions">
        <ShareProfileButton handle={username} />
        {viewAs && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="profile-header__icon-button"
                data-active={viewAs.viewer !== 'owner' || undefined}
                aria-label={viewAs.viewer === 'owner' ? 'Ver como' : `Vendo como ${viewerOptions.find((option) => option.value === viewAs.viewer)?.label.toLowerCase()}`}
                title={viewAs.viewer === 'owner' ? 'Ver como' : `Vendo como ${viewerOptions.find((option) => option.value === viewAs.viewer)?.label.toLowerCase()}`}
              >
                <Eye size={16} aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {viewerOptions.map((option) => (
                <DropdownMenuItem key={option.value} onSelect={() => viewAs.onChange(option.value)}>
                  <Check size={16} aria-hidden style={{ visibility: option.value === viewAs.viewer ? 'visible' : 'hidden' }} />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {isOwner && (
          <Button asChild variant="ghost" size="sm" className="profile-header__icon-button">
            <Link viewTransition to="/app/settings/profile" aria-label="Editar perfil" title="Editar perfil">
              <Pencil size={16} aria-hidden />
            </Link>
          </Button>
        )}
      </div>
      </div>

      <div className="profile-header__identity">
        <h1 className="profile-header__name" title={name}>
          {name}
        </h1>
        <p className="profile-header__handle">@{username}</p>
        {headline && (
          <p className="profile-header__headline" title={headline}>
            {headline}
          </p>
        )}
        {validator && (
          <p className="profile-header__validator">
            <BadgeCheck size={15} aria-hidden />
            <strong>Validador</strong>
            <span>
              desde <time dateTime={validator.since}>{formatMonth(validator.since)}</time>
              {validatorDetail && `, ${validatorDetail}`}
            </span>
          </p>
        )}
        <div className="profile-header__facts">
          {state && (
            <p className="profile-header__fact" title={STATES[state] ?? state}>
              <MapPin size={14} aria-hidden />
              {state}
            </p>
          )}
          <p className="profile-header__fact">
            <CalendarDays size={14} aria-hidden />
            Membro desde <time dateTime={memberSince}>{formatMonth(memberSince)}</time>
          </p>
          <span className="profile-header__links">
            {links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                title={link.url}
                aria-label={link.label}
                className="profile-header__link"
              >
                <LinkIcon url={link.url} />
              </a>
            ))}
            {portfolioUrl && (
              <a href={portfolioUrl} target="_blank" rel="noreferrer" title={`Portfólio: ${portfolioUrl}`} aria-label="Portfólio" className="profile-header__link">
                <LayoutGrid size={16} aria-hidden />
              </a>
            )}
          </span>
        </div>
      </div>

    </Card>
  )
}

/** LinkedIn's "in" mark: simple-icons dropped it at LinkedIn's request, so the path lives here. */
const LINKEDIN = {
  path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
}

const BRANDS = [
  { host: 'github.com', icon: siGithub },
  { host: 'gitlab.com', icon: siGitlab },
  { host: 'linkedin.com', icon: LINKEDIN },
  { host: 'dev.to', icon: siDevdotto },
  { host: 'x.com', icon: siX },
]

/** Brand mark for known sites; any other site gets the globe. */
function LinkIcon({ url }: { url: string }) {
  const brand = BRANDS.find(({ host }) => new URL(url).hostname.endsWith(host))
  if (!brand) return <Globe size={16} aria-hidden />
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d={brand.icon.path} />
    </svg>
  )
}

const STATES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
}
