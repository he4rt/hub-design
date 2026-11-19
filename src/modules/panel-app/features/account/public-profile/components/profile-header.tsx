import { Link } from 'react-router'
import { CalendarDays, Globe, MapPin, Pencil, ShieldCheck } from 'lucide-react'
import { siDevdotto, siGithub, siGitlab, siX } from 'simple-icons'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { MemberProfile } from '@/mocks/db'
import { formatMonth } from '@/modules/panel-app/lib/dates'
import { byRecent, type ShownAchievement } from '../lib/achievements'
import { AchievementMedal } from './achievement-medal'
import { AllAchievementsDialog } from './all-achievements-dialog'
import { ShareProfileButton } from './share-profile-button'
import './profile-header.css'

const BADGES_IN_HEADER = 10

/**
 * Identity card in the dev.to layout: centered identity over the banner, facts and links, then
 * a row of the most recent achievements. A validator gets a ring and a mark in their own color.
 * No counters, level, or follow button.
 */
export function ProfileHeader({
  name,
  photoUrl,
  profile,
  isOwner,
  memberSince,
  state,
  achievements,
}: {
  name: string
  photoUrl: string | null
  profile: MemberProfile
  isOwner: boolean
  /** When the account was created in the Hub; it does not know how long someone has been in He4rt. */
  memberSince: string
  /** UF of the city in the member's account; only the state shows, never the city. */
  state: string | null
  achievements: ShownAchievement[]
}) {
  const { validator } = profile
  const validatorDetail = validator && [validator.role, validator.company].filter(Boolean).join(' · ')

  return (
    <Card className="profile-header" data-validator={validator ? '' : undefined}>
      <div className="profile-header__banner" aria-hidden />
      <Avatar src={photoUrl} name={name} size="lg" className="profile-header__avatar" />
      <div className="profile-header__actions">
        <ShareProfileButton handle={profile.handle} />
        {isOwner && (
          <Button asChild variant="secondary" size="sm">
            <Link to="/app/settings/profile">
              <Pencil size={14} aria-hidden />
              Editar perfil
            </Link>
          </Button>
        )}
      </div>

      <div className="profile-header__identity">
        <h1 className="profile-header__name" title={name}>
          {name}
        </h1>
        <p className="profile-header__handle">@{profile.handle}</p>
        {validator && (
          <p className="profile-header__validator">
            <ShieldCheck size={14} aria-hidden />
            <strong>Validador</strong>
            <span>
              desde <time dateTime={validator.since}>{formatMonth(validator.since)}</time>
              {validatorDetail && ` · ${validatorDetail}`}
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
          {profile.links.map((link) => (
            <a
              key={link.id}
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

      {achievements.length > 0 && (
        <div className="profile-header__badges">
          <ul aria-label="Conquistas mais recentes">
            {byRecent(achievements)
              .slice(0, BADGES_IN_HEADER)
              .map((item) => (
                <li key={item.achievement.id}>
                  <AchievementMedal item={item} />
                </li>
              ))}
          </ul>
          {achievements.length > BADGES_IN_HEADER && (
            <AllAchievementsDialog items={achievements} firstName={name.split(' ')[0]} />
          )}
        </div>
      )}
    </Card>
  )
}

const BRANDS = [
  { host: 'github.com', icon: siGithub },
  { host: 'gitlab.com', icon: siGitlab },
  { host: 'dev.to', icon: siDevdotto },
  { host: 'x.com', icon: siX },
]

/** Brand mark for known sites; simple-icons has no LinkedIn mark, so it and any other site get the globe. */
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
