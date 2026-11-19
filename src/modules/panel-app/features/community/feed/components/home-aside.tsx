import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/card'
import { TrailLog, TrailLogItem } from '@/components/ui/trail-log'
import { useNow } from '@/hooks/use-now'
import { formatShortDate } from '@/lib/feed-post'
import { emptyProfile, recordTypeLabels, trajectoryGraph } from '@/lib/trajectory/graph'
import { useDb, type User } from '@/mocks/db'
import { isProfileReminderVisible } from '../reminders/actions'
import { EmailReminder } from '../reminders/components/email-reminder'
import { NextSteps } from '../reminders/components/next-steps'
import './home-aside.css'

const DAY_MS = 24 * 60 * 60 * 1000
/** Blocks of the member's moment under the trajectory, so the column stays shorter than the Feed. */
const MAX_BLOCKS = 2
const LEARNING_ITEMS = 3
/** Latest records of the trajectory shown beside the Feed; the rest is on the profile. */
const RECENT_RECORDS = 3

/**
 * Right column of the home: the member's latest trajectory records, then the
 * blocks of their moment, first what they still need to do, then what they are
 * learning from others and what the community did today.
 */
export function HomeAside({ account }: { account: User }) {
  const posts = useDb((state) => state.feedPosts)
  const users = useDb((state) => state.users)
  const profile = useDb((state) => state.profiles.find((p) => p.userId === account.id))
  const squads = useDb((state) => state.squads)
  const projects = useDb((state) => state.projects)
  const memberships = useDb((state) => state.memberships)
  const deliveries = useDb((state) => state.deliveries)
  const validations = useDb((state) => state.validations)
  const now = useNow()

  const alive = posts.filter((p) => p.deletedAt === null && p.sharedOnFeed)
  const learning = alive
    .flatMap((post) =>
      post.reactions
        .filter((r) => r.userId === account.id && (r.type === 'learning-too' || r.type === 'want-to-learn'))
        .map((r) => ({ post, at: r.createdAt })),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((item, i, all) => all.findIndex((other) => other.post.id === item.post.id) === i)
  // The same trajectory as the profile, as its owner reads it: every kind of record, not only publications.
  const own = trajectoryGraph(profile ?? emptyProfile(account.id), {
    squads,
    projects,
    memberships,
    deliveries,
    validations,
    posts,
    viewer: 'owner',
  }).entries.filter((entry) => entry.type !== null)
  const today = alive.filter((p) => now - Date.parse(p.createdAt) < DAY_MS)
  const authorsToday = new Set(today.map((p) => p.userId)).size

  const blocks: { key: string; node: ReactNode }[] = []
  if (!account.emailVerifiedAt) blocks.push({ key: 'email', node: <EmailReminder account={account} /> })
  if (isProfileReminderVisible(account, now)) blocks.push({ key: 'next', node: <NextSteps account={account} /> })
  if (learning.length > 0) {
    blocks.push({
      key: 'learning',
      node: (
        <Card className="home-aside__block">
          <h2>Você está aprendendo</h2>
          <p className="home-aside__hint">Do que você marcou como “Aprendendo também” ou “Quero aprender isso”.</p>
          <ul className="home-aside__list">
            {learning.slice(0, LEARNING_ITEMS).map(({ post }) => {
              const author = users.find((u) => u.id === post.userId)
              return (
                <li key={post.id}>
                  <p title={post.learned}>{post.learned}</p>
                  <span>{author?.name ?? 'Membro'}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      ),
    })
  }
  blocks.push({
    key: 'today',
    node: (
      <Card className="home-aside__block">
        <h2>Hoje na comunidade</h2>
        <p>
          {today.length === 0 ? (
            'Ninguém registrou um aprendizado nas últimas 24 horas. Que tal ser a primeira pessoa?'
          ) : (
            <>
              <strong className="home-aside__number">{today.length}</strong>{' '}
              {today.length === 1 ? 'aprendizado registrado' : 'aprendizados registrados'} por{' '}
              <strong className="home-aside__number">{authorsToday}</strong>{' '}
              {authorsToday === 1 ? 'membro' : 'membros'} nas últimas 24 horas.
            </>
          )}
        </p>
        <p className="home-aside__hint">
          Ficou com uma dúvida? Pergunte no <Link to="/app/discussions">Fórum</Link>.
        </p>
      </Card>
    ),
  })

  return (
    <div className="home-aside">
      <Card className="home-aside__block">
        <h2>Sua trajetória</h2>
        {own.length === 0 ? (
          <p className="home-aside__hint">Seu primeiro registro aparece aqui: um aprendizado, um curso ou uma entrega.</p>
        ) : (
          <TrailLog className="home-aside__trajectory">
            {own.slice(0, RECENT_RECORDS).map((entry, i) => (
              <TrailLogItem
                key={entry.id}
                tone={i === 0 ? 'move' : 'past'}
                title={<p title={entry.title}>{entry.title}</p>}
                meta={
                  <>
                    {entry.type ? `${recordTypeLabels[entry.type]}, ` : ''}
                    <time dateTime={entry.date}>{formatShortDate(entry.date, now)}</time>
                  </>
                }
              />
            ))}
          </TrailLog>
        )}
        {own.length > RECENT_RECORDS && <Link to={`/members/${account.username}?aba=trajetoria`}>Ver toda a trajetória</Link>}
      </Card>
      {blocks.slice(0, MAX_BLOCKS).map((block) => (
        <div key={block.key}>{block.node}</div>
      ))}
    </div>
  )
}
