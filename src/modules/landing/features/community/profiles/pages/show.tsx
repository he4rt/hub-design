import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { NotFound } from '@/components/not-found'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ValidationRecord } from '@/components/validation/validation-record'
import { useDebugActions } from '@/debug/use-debug-actions'
import { formatPostDate, OBJECTIVE_PROGRESS } from '@/lib/feed-post'
import { areaLabels, labelOf, SITUATIONS } from '@/lib/member-profile'
import { db, useDb } from '@/mocks/db'
import './show.css'

const MONTH_YEAR = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

/**
 * Public profile: anyone with the link reads it once the member publishes it.
 * A private profile only says so. The starting point, the birth date and
 * "open to opportunities" never show here.
 */
export default function Show() {
  const { username } = useParams()
  const navigate = useNavigate()
  const member = useDb((state) => state.users.find((u) => u.username === username && u.onboardedAt) ?? null)
  const viewerId = useDb((state) => state.session?.userId ?? null)
  const feedPosts = useDb((state) => state.feedPosts)
  const feedCollections = useDb((state) => state.feedCollections)
  const [params, setParams] = useSearchParams()
  const validations = useDb((state) => state.validations)
  const projects = useDb((state) => state.teamProjects)
  const contestations = useDb((state) => state.contestations)

  useDebugActions('Perfil público', [
    { label: 'Abrir perfil inexistente', run: () => navigate('/members/nao-existe') },
    { label: 'Abrir perfil privado', run: () => navigate('/members/bruno-lima') },
    {
      label: 'Ver como visitante',
      description: 'Remove a sessão de membro.',
      run: () => db.set((state) => ({ ...state, session: null })),
    },
  ])

  if (!member) return <NotFound />

  const isOwner = viewerId === member.id

  if (!member.published) {
    return (
      <main className="public-profile public-profile--private">
        <Card>
          <h1>Este perfil é privado</h1>
          {isOwner && (
            <Button asChild variant="secondary">
              <Link to="/app/settings/profile">Publicar meu perfil</Link>
            </Button>
          )}
        </Card>
      </main>
    )
  }

  const back = encodeURIComponent(`/members/${member.username}`)
  const github = member.linkedAccounts.find((account) => account.provider === 'github')
  const linkedin = member.linkedAccounts.find((account) => account.provider === 'linkedin')
  const links = [
    github && { label: 'GitHub', href: `https://github.com/${github.handle}` },
    linkedin && { label: 'LinkedIn', href: `https://www.linkedin.com/in/${linkedin.handle}` },
    member.portfolioUrl && { label: 'Portfólio', href: member.portfolioUrl },
  ].filter((link) => !!link)
  // Only the diary publications the member chose to show here.
  const posts = feedPosts
    .filter((p) => p.userId === member.id && p.shownOnProfile && p.deletedAt === null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  // A collection shows only with at least one publication the member chose to show here.
  const collections = feedCollections
    .filter((c) => c.userId === member.id)
    .map((c) => ({ ...c, count: posts.filter((p) => p.collectionIds.includes(c.id)).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const selected = collections.find((c) => c.id === params.get('collection'))?.id ?? 'all'
  const shown = selected === 'all' ? posts : posts.filter((p) => p.collectionIds.includes(selected))
  // A correction replaces the record it corrects on the profile; the old one stays reachable from the new one.
  const published = validations
    .filter((v) => v.memberId === member.id && v.status === 'recorded' && v.published)
    .filter((v) => !validations.some((n) => n.supersedesId === v.id && n.status === 'recorded'))
    .sort((a, b) => (b.recordedAt ?? '').localeCompare(a.recordedAt ?? ''))
  const meta = [areaLabels(member.areas), member.city && `${member.city.name} — ${member.city.uf}`].filter(Boolean)

  return (
    <main className="public-profile">
      <header className="public-profile__header">
        <Avatar src={member.photoUrl} name={member.name} size="lg" />
        <div className="public-profile__identity">
          <h1 title={member.name}>{member.name}</h1>
          <p title={`@${member.username}`}>@{member.username}</p>
          <p title={meta.join(' · ')}>{meta.join(' · ')}</p>
          <p>Na comunidade desde {MONTH_YEAR.format(new Date(member.onboardedAt!))}</p>
        </div>
      </header>

      {(member.bio || member.situation) && (
        <Card>
          {member.bio && <p>{member.bio}</p>}
          {member.situation && <p className="public-profile__muted">{labelOf(SITUATIONS, member.situation)}</p>}
        </Card>
      )}

      {member.languages.length > 0 && (
        <Card>
          <h2>Linguagens</h2>
          <ul className="public-profile__stacks">
            {member.languages.map((language) => (
              <li key={language}>{language}</li>
            ))}
          </ul>
        </Card>
      )}

      {links.length > 0 && (
        <Card>
          <h2>Redes</h2>
          <ul className="public-profile__links">
            {links.map((link) => (
              <li key={link.label}>
                <a href={link.href} target="_blank" rel="noopener noreferrer" title={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {published.length > 0 && (
        <Card>
          <h2>Validações</h2>
          <p className="public-profile__muted">
            Registradas por validadores de fora do squad. Cada uma aparece inteira, com pontos fortes e de melhoria.
          </p>
          {published.map((v) => (
            <div key={v.id} className="public-profile__validation">
              {contestations.some((c) => c.validationId === v.id && c.status === 'open') && (
                <p className="public-profile__muted">Revisão em andamento.</p>
              )}
              <ValidationRecord validation={v} projectName={projects.find((p) => p.id === v.projectId)?.name} />
            </div>
          ))}
        </Card>
      )}

      <Card>
        <h2>Trajetória</h2>
        {collections.length > 0 && (
          <ToggleGroup
            type="single"
            variant="chips"
            value={selected}
            aria-label="Trilhas"
            onValueChange={(next) => next && setParams(next === 'all' ? {} : { collection: next }, { replace: true })}
          >
            <ToggleGroupItem value="all">
              Tudo <span className="public-profile__count">{posts.length}</span>
            </ToggleGroupItem>
            {collections.map((c) => (
              <ToggleGroupItem key={c.id} value={c.id} title={c.name}>
                {c.name} <span className="public-profile__count">{c.count}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        {shown.length === 0 ? (
          <p className="public-profile__muted">Nenhum registro público ainda.</p>
        ) : (
          <ol className="public-profile__records">
            {shown.map((post) => (
              <li key={post.id}>
                <time dateTime={post.createdAt}>{formatPostDate(post.createdAt)} · Diário de aprendizado</time>
                <p>{post.learned}</p>
                <p className="public-profile__muted">Como aplicou: {post.applied}</p>
                <p className="public-profile__muted">{labelOf(OBJECTIVE_PROGRESS, post.objectiveProgress)} do objetivo</p>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {isOwner ? (
        <Card className="public-profile__cta">
          <p>Este é o seu perfil, como os visitantes o veem.</p>
          <Button asChild variant="secondary">
            <Link to="/app/settings/profile">Editar perfil</Link>
          </Button>
        </Card>
      ) : viewerId === null ? (
        <Card className="public-profile__cta">
          <p>Entre no Hub para participar de squads, montar sua trajetória e interagir com a comunidade.</p>
          <div className="public-profile__cta-actions">
            <Button asChild>
              <Link to={`/app/login?redirect=${back}`}>Entrar</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to={`/app/register?redirect=${back}`}>Criar conta</Link>
            </Button>
          </div>
        </Card>
      ) : null}
    </main>
  )
}
