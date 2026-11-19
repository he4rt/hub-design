import { Link } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { areaLabels, labelOf, OBJECTIVES } from '@/lib/member-profile'
import { useDb, type User } from '@/mocks/db'
import './profile-card.css'

const SHOWN_COLLECTIONS = 4

/**
 * The member beside the Feed, like a LinkedIn profile preview: who they are,
 * the objective, how complete the profile is and their study tracks
 * ("trilhas"). The photo and name open their profile, where they edit it.
 */
export function ProfileCard({ account }: { account: User }) {
  const posts = useDb((state) => state.feedPosts)
  const allCollections = useDb((state) => state.feedCollections)
  const own = posts
    .filter((p) => p.userId === account.id && p.deletedAt === null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const collections = allCollections
    .filter((c) => c.userId === account.id)
    .map((c) => ({ ...c, count: own.filter((p) => p.collectionIds.includes(c.id)).length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const headline = account.bio || areaLabels(account.areas)
  const city = account.city && `${account.city.name} — ${account.city.uf}`

  return (
    <Card className="profile-card">
      <div className="profile-card__cover" aria-hidden />
      <div className="profile-card__identity">
        <Link to={`/members/${account.username}`} aria-hidden tabIndex={-1}>
          <Avatar src={account.photoUrl} name={account.name} size="xl" />
        </Link>
        <h2 title={account.name}>
          <Link to={`/members/${account.username}`} title="Ver meu perfil">
            {account.name}
          </Link>
        </h2>
        {headline && <p title={headline}>{headline}</p>}
        {city && <p className="profile-card__muted">{city}</p>}
      </div>

      <dl className="profile-card__facts">
        <div>
          <dt>Objetivo</dt>
          <dd>{account.objective ? labelOf(OBJECTIVES, account.objective) : 'Não definido'}</dd>
        </div>
        <div>
          <dt>Perfil completo</dt>
          <dd className="profile-card__percent">{account.completeness.percent}%</dd>
        </div>
      </dl>
      <Progress value={account.completeness.percent} aria-label="Perfil completo" />

      {collections.length > 0 && (
        <section className="profile-card__section" aria-labelledby="profile-card-collections">
          <h3 id="profile-card-collections">Suas trilhas</h3>
          <ul className="profile-card__collections">
            {collections.slice(0, SHOWN_COLLECTIONS).map((c) => (
              <li key={c.id}>
                <span title={c.name}>{c.name}</span>
                <span className="profile-card__count">{c.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

    </Card>
  )
}
