import { useRef, useState, type ReactNode } from 'react'
import { CalendarDays, Camera, Globe, MapPin, Pencil, ShieldCheck, SquareArrowOutUpRight, X } from 'lucide-react'
import { Tabs } from 'radix-ui'
import { Link } from 'react-router'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useNow } from '@/hooks/use-now'
import { formatMonth } from '@/lib/dates'
import { formatShortDate } from '@/lib/feed-post'
import { AREAS, LANGUAGE_LEVELS, labelOf } from '@/lib/member-profile'
import { emptyProfile, trajectoryGraph } from '@/lib/trajectory/graph'
import { memberAchievements, memberJourney } from '@/mocks/achievements'
import { useDb, type Discussion, type MockDb, type User, type Validation } from '@/mocks/db'
import { AppShell, PersonMark } from './app-shell'
import { Post } from './feed'
import { Achievements } from './achievements'
import { Graph } from './graph'
import { Journey, JourneyCompact } from './hub'
import { Button, Chip, More, Node, Note } from './parts'
import { STAGE_ORDER, malhaStore, useLabParams } from './theme'
import './profile.css'

const TABS = { 'visao-geral': 'Visão geral', trajetoria: 'Trajetória', forum: 'Fórum' } as const
/** Records each list shows before "Carregar mais". */
const PAGE = 8
type Tab = keyof typeof TABS
const FORUM_KINDS = { pergunta: 'Perguntas', resposta: 'Respostas', solucao: 'Soluções' } as const
type ForumKind = keyof typeof FORUM_KINDS
type ForumItem = { id: string; kind: ForumKind; date: string; discussion: Discussion }

/**
 * The member's part in the Forum, apart from the trajectory: the questions they opened, the
 * discussions they answered, and the answers an author marked as the solution. Newest first.
 */
function forumItems(discussions: Discussion[], userId: string): ForumItem[] {
  return discussions
    .flatMap((d): ForumItem[] => {
      const mine = d.replies.filter((r) => r.authorId === userId)
      const solution = mine.find((r) => r.id === d.solvedReplyId)
      return [
        ...(d.authorId === userId ? [{ id: `q-${d.id}`, kind: 'pergunta' as const, date: d.createdAt, discussion: d }] : []),
        ...(mine.length > 0 && d.authorId !== userId
          ? [{ id: `a-${d.id}`, kind: 'resposta' as const, date: mine[mine.length - 1].createdAt, discussion: d }]
          : []),
        ...(solution ? [{ id: `s-${d.id}`, kind: 'solucao' as const, date: solution.createdAt, discussion: d }] : []),
      ]
    })
    .toSorted((a, b) => b.date.localeCompare(a.date))
}

/**
 * "Meu perfil" in "Técnico × Traçado": the owner's own profile, read from the database like the
 * public profile at /members/:username. The Traçado (line and node) draws only the trajectory and
 * the journey; the rest is the Técnico language. Nothing here writes.
 */
export default function MalhaProfile() {
  const state = useDb((s) => s)
  const now = useNow()
  const [params, setParams] = useLabParams()
  const [emptyTrajectory, setEmptyTrajectory] = useState(false)
  // The lab writes nothing: a picked cover or photo lives on this screen until it reloads.
  const [cover, setCover] = useState<string | null>(null)
  const [photo, setPhoto] = useState<string | null | undefined>(undefined)
  const tab: Tab = (params.get('aba') as Tab) in TABS ? (params.get('aba') as Tab) : 'visao-geral'
  // One limit for the open tab, in the URL like the Feed's; changing tab resets it.
  const limit = Math.max(PAGE, Number(params.get('limite')) || PAGE)
  const tipo = params.get('tipo') as ForumKind | null
  const kind = tipo && tipo in FORUM_KINDS ? tipo : null
  const more = () =>
    setParams(
      (current) => {
        current.set('limite', String(limit + PAGE))
        return current
      },
      { preventScrollReset: true },
    )

  useDebugActions('Meu perfil (Técnico × Traçado)', [
    { label: 'Tema claro', run: () => malhaStore.set(() => ({ theme: 'light' })) },
    { label: 'Tema escuro', run: () => malhaStore.set(() => ({ theme: 'dark' })) },
    { label: 'Abrir Visão geral', run: () => setParams({}) },
    { label: 'Abrir Trajetória', run: () => setParams({ aba: 'trajetoria' }) },
    { label: 'Abrir Fórum', run: () => setParams({ aba: 'forum' }) },
    { label: emptyTrajectory ? 'Mostrar a trajetória' : 'Ver a trajetória vazia', run: () => setEmptyTrajectory((e) => !e) },
    { label: 'Usar uma capa de exemplo', run: () => setCover(sampleCover()) },
    { label: 'Remover a capa', run: () => setCover(null) },
    { label: 'Remover a foto', run: () => setPhoto(null) },
  ])

  return (
    <AppShell
      screen="profile"
      path={`/design-lab/perfil${tab === 'visao-geral' ? '' : `?aba=${tab}`}`}
    >
      {(account, root) => {
        const profile = state.profiles.find((p) => p.userId === account.id) ?? emptyProfile(account.id)
        const graph = trajectoryGraph(profile, { ...state, viewer: 'owner' })
        const entries = emptyTrajectory ? [] : graph.entries
        const journey = memberJourney(state, account.id)
        const stage = STAGE_ORDER.indexOf(journey.stage)
        const achievements = memberAchievements(state, account.id, now)
        // The profile shows only what the member chose to show; the rest stays in the Feed.
        const own = state.feedPosts.filter((p) => p.userId === account.id && p.deletedAt === null)
        const posts = own.filter((p) => p.shownOnProfile).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
        const feedOnly = own.length - posts.length
        const validations = state.validations
          .filter((v) => v.memberId === account.id && v.status === 'recorded' && v.published)
          .filter((v) => !state.validations.some((n) => n.supersedesId === v.id && n.status === 'recorded'))
          .toSorted((a, b) => (b.recordedAt ?? '').localeCompare(a.recordedAt ?? ''))
        const forum = forumItems(state.discussions, account.id).filter((item) => !kind || item.kind === kind)
        const current = profile.experiences.find((e) => e.endedAt === null)
        const areas = account.areas.map((area) => labelOf(AREAS, area))

        return (
          <main className="txf-main txp" data-wide>
            <Identity
              user={{ ...account, photoUrl: photo === undefined ? account.photoUrl : photo }}
              state={state}
              cover={cover}
              onCover={setCover}
              onPhoto={setPhoto}
            />

            {!account.published && (
              <div className="txp-private">
                <Note tone="warning" title="Seu perfil está privado.">
                  A comunidade passa a vê-lo quando você o publicar em Editar perfil.
                </Note>
              </div>
            )}

            <Tabs.Root
              className="txp-tabs"
              value={tab}
              onValueChange={(value) => setParams(value === 'visao-geral' ? {} : { aba: value })}
            >
              <Tabs.List className="tx-tabs__list txp-tabs__list" aria-label="Seções do perfil">
                {(Object.keys(TABS) as Tab[]).map((value) => (
                  <Tabs.Trigger key={value} value={value} className="tx-tabs__trigger">
                    {TABS[value]}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              <div className="txf-body txp-body">
                <div className="txf-column">
                  <Tabs.Content value="visao-geral" className="txp-sections">
                    <section className="txp-section" aria-labelledby="txp-about">
                      <h2 id="txp-about">Sobre</h2>
                      {account.bio ? (
                        <div className="txp-readme">
                          {account.bio.split(/\n\s*\n/).map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="tx-meta">Conte quem você é no texto "Sobre", em Editar perfil.</p>
                      )}
                    </section>

                    {validations.length > 0 && (
                      <section className="txp-section" aria-labelledby="txp-validations">
                        <h2 id="txp-validations">Validações</h2>
                        {validations.map((v) => (
                          <ValidationRecord key={v.id} validation={v} state={state} member={account} />
                        ))}
                      </section>
                    )}

                    <section className="txp-section" aria-labelledby="txp-diary">
                      <h2 id="txp-diary">Diário</h2>
                      {posts.length === 0 ? (
                        <div className="txf-empty">
                          <p className="tx-empty__title">Nenhuma publicação no perfil</p>
                          <p className="tx-meta">Marque "Mostrar no perfil" numa publicação para ela aparecer aqui.</p>
                          <Button asChild>
                            <Link viewTransition to="/app?compose=progress">Registrar um aprendizado</Link>
                          </Button>
                        </div>
                      ) : (
                        <ol className="txf-list">
                          {posts.slice(0, limit).map((post) => (
                            <li key={post.id}>
                              <Post post={post} state={state} viewer={account} now={now} />
                            </li>
                          ))}
                        </ol>
                      )}
                      <More total={posts.length} limit={limit} onMore={more} />
                      {feedOnly > 0 && (
                        <p className="tx-meta txp-feed-only">
                          {feedOnly === 1 ? '1 publicação está só no Feed.' : `${feedOnly} publicações estão só no Feed.`}
                        </p>
                      )}
                    </section>
                  </Tabs.Content>

                  <Tabs.Content value="trajetoria" className="txp-sections">
                    <section className="txp-section" aria-labelledby="txp-journey">
                      <h2 id="txp-journey">Jornada</h2>
                      <Journey current={stage} />
                    </section>
                    <section className="txp-section" aria-labelledby="txp-trajectory">
                      <h2 id="txp-trajectory">Trajetória</h2>
                      {entries.length === 0 ? (
                        <div className="tx-empty">
                          <div className="tx-empty__path" aria-hidden>
                            <Node kind="current" />
                            <i />
                            <Node kind="future" />
                            <i />
                            <Node kind="future" />
                          </div>
                          <div>
                            <p className="tx-empty__title">Sua trajetória ainda não tem registros</p>
                            <p className="tx-empty__text">Registre o que você aprendeu e escolha o que aparece aqui.</p>
                            <Button asChild>
                              <Link viewTransition to="/app?compose=progress">Registrar um aprendizado</Link>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Graph graph={{ ...graph, entries: entries.slice(0, limit) }} />
                          <More total={entries.length} limit={limit} onMore={more} />
                        </>
                      )}
                    </section>
                  </Tabs.Content>

                  <Tabs.Content value="forum" className="txp-sections">
                    <section className="txp-section" aria-labelledby="txp-forum">
                      <h2 id="txp-forum">Fórum</h2>
                      <p className="tx-meta">Perguntas e respostas ficam fora da trajetória. Só membros logados veem esta aba.</p>
                      <div className="txp-filter" role="group" aria-label="Tipo de participação">
                        {([null, ...Object.keys(FORUM_KINDS)] as (ForumKind | null)[]).map((value) => (
                          <button
                            key={value ?? 'all'}
                            type="button"
                            className="txp-filter__item"
                            aria-pressed={kind === value}
                            onClick={() => setParams(value ? { aba: 'forum', tipo: value } : { aba: 'forum' })}
                          >
                            {value ? FORUM_KINDS[value] : 'Tudo'}
                          </button>
                        ))}
                      </div>
                      {forum.length === 0 ? (
                        <div className="txf-empty">
                          <p className="tx-empty__title">Nada no Fórum ainda</p>
                          <p className="tx-meta">Suas perguntas, respostas e soluções aparecem aqui.</p>
                          <Button asChild>
                            <Link viewTransition to="/app/discussions">Ir para o Fórum</Link>
                          </Button>
                        </div>
                      ) : (
                        <ol className="txp-activity">
                          {forum.slice(0, limit).map((item) => (
                            <li key={item.id} className="txp-activity__row">
                              <time dateTime={item.date}>{formatShortDate(item.date, now)}</time>
                              <div>
                                <p className="txp-activity__title">
                                  <Link viewTransition to={`/app/discussions/${item.discussion.id}`} title={item.discussion.title}>
                                    {item.discussion.title}
                                  </Link>
                                </p>
                                <p className="txp-forum__kind">
                                  {item.kind === 'solucao' ? (
                                    <Chip tone="success">Solução aceita</Chip>
                                  ) : (
                                    <span className="tx-meta">
                                      {item.kind === 'pergunta' ? 'Pergunta' : 'Resposta'}
                                      {item.kind === 'pergunta' &&
                                        `, ${item.discussion.replies.length === 1 ? '1 resposta' : `${item.discussion.replies.length} respostas`}`}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                      <More total={forum.length} limit={limit} onMore={more} />
                    </section>
                  </Tabs.Content>
                </div>

                <aside className="tx-frame__lateral txf-lateral txp-lateral" aria-label="Resumo">
                  {(areas.length > 0 || current || account.languages.length > 0 || account.spokenLanguages.length > 0) && (
                    <dl className="txp-facts">
                      {areas.length > 0 && (
                        <div>
                          <dt>Áreas</dt>
                          <dd className="txp-tags">
                            {areas.map((area) => (
                              <Chip key={area} tone="brand">
                                {area}
                              </Chip>
                            ))}
                          </dd>
                        </div>
                      )}
                      {current && (
                        <div>
                          <dt>Atuação atual</dt>
                          <dd title={`${current.role}, ${current.organization}`}>
                            {current.role}, {current.organization}
                          </dd>
                        </div>
                      )}
                      {account.languages.length > 0 && (
                        <div>
                          <dt>Tecnologias</dt>
                          <dd className="txp-tags">
                            {account.languages.map((language) => (
                              <Chip key={language} tone="neutral">
                                {language}
                              </Chip>
                            ))}
                          </dd>
                        </div>
                      )}
                      {account.spokenLanguages.length > 0 && (
                        <div>
                          <dt>Idiomas</dt>
                          <dd>
                            {account.spokenLanguages
                              .map(({ language, level }) => `${language} (${labelOf(LANGUAGE_LEVELS, level).toLowerCase()})`)
                              .join(', ')}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {tab !== 'trajetoria' && (
                    <section>
                      <h4>Sua jornada</h4>
                      <JourneyCompact current={stage} />
                    </section>
                  )}
                  <Achievements achievements={achievements} stage={journey.stage} root={root} />
                </aside>
              </div>
            </Tabs.Root>
          </main>
        )
      }}
    </AppShell>
  )
}

/** Crops the picture to `width`×`height` from its center and shrinks it, as the /app cover and photo do. */
async function readImage(file: File, width: number, height: number): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const ratio = width / height
  const w = Math.min(bitmap.width, bitmap.height * ratio)
  const h = w / ratio
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')?.drawImage(bitmap, (bitmap.width - w) / 2, (bitmap.height - h) / 2, w, h, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.82)
}

/** A cover to try the layout with: lines and nodes on ink, drawn here so the lab needs no file. */
function sampleCover(): string {
  const canvas = document.createElement('canvas')
  canvas.width = 1584
  canvas.height = 396
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#1b1b1b'
  ctx.fillRect(0, 0, 1584, 396)
  ctx.lineWidth = 6
  ;['#6a2fe0', '#bfbfbf', '#166534'].forEach((color, i) => {
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.moveTo(0, 120 + i * 80)
    ctx.bezierCurveTo(500, 60 + i * 120, 1000, 340 - i * 90, 1584, 200 + i * 40)
    ctx.stroke()
  })
  return canvas.toDataURL('image/jpeg', 0.82)
}

/** An icon button that opens the file picker directly and hands the cropped picture back. */
function PickImage({
  label,
  width,
  height,
  className,
  onPick,
  onError,
  children,
}: {
  label: string
  width: number
  height: number
  className: string
  onPick: (url: string) => void
  onError: (message: string | null) => void
  children: ReactNode
}) {
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          setPending(true)
          onError(null)
          try {
            onPick(await readImage(file, width, height))
          } catch {
            onError('Não foi possível usar esta imagem. Tente outra.')
          } finally {
            setPending(false)
          }
        }}
      />
      <button type="button" className={className} aria-label={label} title={label} disabled={pending} onClick={() => input.current?.click()}>
        {children}
      </button>
    </>
  )
}

/**
 * Who the member is, LinkedIn style: the cover band on top, the photo (the arc, a circle) over its
 * lower edge, then the name, the handle in mono, the facts and links. No counters. The owner changes
 * the cover with the camera on it and removes it with the X; the photo has its own camera.
 */
function Identity({
  user,
  state,
  cover,
  onCover,
  onPhoto,
}: {
  user: User
  state: MockDb
  cover: string | null
  onCover: (url: string | null) => void
  onPhoto: (url: string | null) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const validator = state.validators.find((v) => v.userId === user.id && v.suspension === null)
  const validatorDetail = validator?.showEmployer ? [validator.jobTitle, validator.company].filter(Boolean).join(', ') : ''
  const github = user.linkedAccounts.find((a) => a.provider === 'github')
  const linkedin = user.linkedAccounts.find((a) => a.provider === 'linkedin')
  const links = [
    github && { label: 'GitHub', url: `https://github.com/${github.handle}` },
    linkedin && { label: 'LinkedIn', url: `https://www.linkedin.com/in/${linkedin.handle}` },
    user.portfolioUrl && { label: 'Portfólio', url: user.portfolioUrl },
  ].filter((link) => !!link)

  return (
    <header className="txp-id">
      <div
        className="txp-id__cover"
        data-image={cover ? '' : undefined}
        style={cover ? { backgroundImage: `url(${cover})` } : undefined}
      >
        <p className="txp-id__error" role="status">
          {error}
        </p>
        <span className="txp-id__tools">
          {cover && (
            <button type="button" className="txp-id__icon" aria-label="Remover a capa" title="Remover a capa" onClick={() => onCover(null)}>
              <X strokeWidth={1.75} aria-hidden />
            </button>
          )}
          <PickImage
            label={cover ? 'Trocar a capa' : 'Escolher uma capa'}
            width={1584}
            height={396}
            className="txp-id__icon"
            onPick={onCover}
            onError={setError}
          >
            <Camera strokeWidth={1.75} aria-hidden />
          </PickImage>
        </span>
      </div>
      <div className="txp-id__photo">
        <PersonMark user={user} size="xl" />
        <PickImage
          label={user.photoUrl ? 'Trocar a foto de perfil' : 'Escolher uma foto de perfil'}
          width={400}
          height={400}
          className="txp-id__icon txp-id__photo-edit"
          onPick={onPhoto}
          onError={setError}
        >
          <Camera strokeWidth={1.75} aria-hidden />
        </PickImage>
      </div>
      <div className="txp-id__text">
        <h1 title={user.name}>{user.name}</h1>
        <p className="tx-mono txp-id__handle">@{user.username}</p>
        {validator && (
          <p className="txp-id__validator">
            <ShieldCheck strokeWidth={1.75} aria-hidden />
            <b>Validador</b>
            <span>
              desde {formatMonth(validator.approvedAt)}
              {validatorDetail && `, ${validatorDetail}`}
            </span>
          </p>
        )}
        <ul className="txp-id__facts">
          {user.city && (
            <li>
              <MapPin strokeWidth={1.75} aria-hidden />
              {user.city.uf}
            </li>
          )}
          <li>
            <CalendarDays strokeWidth={1.75} aria-hidden />
            Membro desde {formatMonth(user.createdAt)}
          </li>
          {links.map((link) => (
            <li key={link.url}>
              <a href={link.url} target="_blank" rel="noreferrer" title={link.url}>
                <Globe strokeWidth={1.75} aria-hidden />
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="txp-id__actions">
        <Button variant="primary" asChild>
          <Link viewTransition to="/app/settings/profile">
            <Pencil strokeWidth={1.75} aria-hidden />
            Editar perfil
          </Link>
        </Button>
        <Button asChild>
          <Link viewTransition to={`/members/${user.username}`}>
            <SquareArrowOutUpRight strokeWidth={1.75} aria-hidden />
            Ver como visitante
          </Link>
        </Button>
      </div>
    </header>
  )
}

/** A recorded validation: the report in Geist, the points on lines, the validator's arc on the side. */
function ValidationRecord({ validation, state, member }: { validation: Validation; state: MockDb; member: User }) {
  const validator = state.users.find((u) => u.id === validation.validatorId)
  const project = state.projects.find((p) => p.id === validation.projectId)
  const role = [validation.validator.jobTitle, validation.validator.company].filter(Boolean).join(', ')
  return (
    <article className="tx-validation txp-validation" aria-label={`Validação em ${validation.competency}`}>
      <header className="tx-validation__head">
        <Node kind="validated" />
        <Chip tone="comp">{validation.competency}</Chip>
        {project && <span className="tx-meta">Projeto {project.name}</span>}
      </header>
      <div>
        <p className="tx-validation__voice">{validation.contribution}</p>
        <ol className="tx-validation__points">
          {validation.strengths.map((point) => (
            <li key={point.text}>
              <Node kind="done" />
              <span>{point.text}</span>
            </li>
          ))}
          {validation.improvements.map((point) => (
            <li key={point.text}>
              <Node kind="pending" />
              <span>
                {point.text} Para a próxima: {point.suggestion}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <aside className="tx-validation__side">
        <PersonMark user={validator} />
        <div>
          <strong>{validation.validator.name}</strong>
          {role}
        </div>
        {validation.recordedAt && <p>Registrada em {formatMonth(validation.recordedAt)}.</p>}
        <p>
          {validation.conflictOfInterest.declared
            ? `Conflito de interesse: ${validation.conflictOfInterest.description}`
            : `Declarou não ter conflito de interesse com ${member.name.split(' ')[0]}.`}
        </p>
      </aside>
    </article>
  )
}
