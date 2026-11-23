import { Link } from 'react-router'
import { CalendarDays, Globe, MapPin, Pencil, ShieldCheck } from 'lucide-react'
import { siDevdotto, siGithub, siGitlab, siX } from 'simple-icons'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatMonth } from '@/lib/dates'
import { CoverArt, CoverControls } from './profile-cover'
import { ShareProfileButton } from './share-profile-button'
import './profile-header.css'

/**
 * Identity card: the cover band on top, the avatar over it, the name in display, then facts and links.
 * Achievements live in one block of the side column. A validator gets a ring and a mark in the info
 * family. No counters, level, or follow button.
 */
export function ProfileHeader({
  userId,
  name,
  username,
  bio,
  photoUrl,
  links,
  validator,
  isOwner,
  memberSince,
  state,
  coverImageUrl,
}: {
  userId: string
  name: string
  username: string
  bio: string
  photoUrl: string | null
  links: { label: string; url: string }[]
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
      <Avatar src={photoUrl} name={name} size="xl" className="profile-header__avatar" />
      <div className="profile-header__actions">
        <ShareProfileButton handle={username} />
        {isOwner && (
          <Button asChild variant="secondary" size="sm">
            <Link to="/app/settings/profile">
              <Pencil size={16} aria-hidden />
              Editar perfil
            </Link>
          </Button>
        )}
      </div>

      <div className="profile-header__identity">
        <h1 className="profile-header__name" title={name}>
          {name}
        </h1>
        <p className="profile-header__handle">@{username}</p>
        {bio && <p className="profile-header__bio">{bio}</p>}
        {validator && (
          <p className="profile-header__validator">
            <ShieldCheck size={16} aria-hidden />
            <strong>Validador</strong>
            <span>
              desde <time dateTime={validator.since}>{formatMonth(validator.since)}</time>
              {validatorDetail && `, ${validatorDetail}`}
            </span>
          </p>
        )}
        <div className="profile-header__facts">
          {state && (
            <p className="profile-header__fact">
              <MapPin size={14} aria-hidden />
              {STATES[state] ?? state}
            </p>
          )}
          <p className="profile-header__fact">
            <CalendarDays size={14} aria-hidden />
            Membro desde <time dateTime={memberSince}>{formatMonth(memberSince)}</time>
          </p>
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
