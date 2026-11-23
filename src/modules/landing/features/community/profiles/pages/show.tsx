import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { NotFound } from '@/components/not-found'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebugActions } from '@/debug/use-debug-actions'
import { areaLabels } from '@/lib/member-profile'
import { useNow } from '@/hooks/use-now'
import { memberAchievements, memberJourney } from '@/mocks/achievements'
import { db, useDb } from '@/mocks/db'
import { AchievementsBox } from '../components/achievements-box'
import { ForumActivity } from '../components/forum-activity'
import { ContributionFacts } from '../components/contribution-facts'
import { DiaryCard } from '../components/diary-card'
import { OwnerNotice } from '../components/owner-notice'
import { ProfileHeader } from '../components/profile-header'
import { ProfileSidebar } from '../components/profile-sidebar'
import { ReadmeCard } from '../components/readme-card'
import { TrajectoryGraph } from '../components/trajectory-graph'
import { ValidationsCard } from '../components/validations-card'
import { shownAchievements } from '../lib/achievements'
import { memberActivity } from '../lib/activity'
import { missingProfileItems } from '../lib/completeness'
import { emptyProfile, trajectoryGraph } from '@/lib/trajectory/graph'
import { viewerOptions, type Viewer } from '@/lib/trajectory/visibility'
import './show.css'

/** Squad work, deliveries and learning live in Trajetória; Fórum adds what only the forum knows. */
const TABS = { 'visao-geral': 'Visão geral', trajetoria: 'Trajetória', forum: 'Fórum' } as const
type Tab = keyof typeof TABS

/**
 * The single public profile of a member, at /members/:username: who they are (from the He4rt
 * account), what they did on the platform, and how they evolved. Anyone with the link reads it
 * once the member publishes it; a private profile only says so, except to its owner.
 */
export default function PublicProfile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const user = useDb((s) => s.users.find((u) => u.username === username && u.onboardedAt))
  const storedProfile = useDb((s) => s.profiles.find((p) => p.userId === user?.id))
  const validatorRecord = useDb((s) => s.validators.find((v) => v.userId === user?.id && v.suspension === null))
  const collections = useDb((s) => s.feedCollections)
  const contestations = useDb((s) => s.contestations)
  const sessionUserId = useDb((db) => db.session?.userId)
  const squads = useDb((db) => db.squads)
  const projects = useDb((db) => db.projects)
  const memberships = useDb((db) => db.memberships)
  const deliveries = useDb((db) => db.deliveries)
  const posts = useDb((db) => db.feedPosts)
  const validations = useDb((db) => db.validations)
  const discussions = useDb((db) => db.discussions)
  // Achievements and the journey are computed from the facts, like the backend would.
  const state = useDb((s) => s)
  const now = useNow()

  // Old links: Atividade became Fórum; the saved publications moved to /app/saved.
  const aba = params.get('aba') === 'atividade' ? 'forum' : params.get('aba')
  const tab: Tab = aba && aba in TABS ? (aba as Tab) : 'visao-geral'

  useDebugActions('Perfil público', [
    { label: 'Abrir Visão geral', run: () => setParams({}) },
    { label: 'Abrir Trajetória', run: () => setParams({ aba: 'trajetoria' }) },
    { label: 'Abrir Fórum (só para quem entrou)', run: () => setParams({ aba: 'forum' }) },
    { label: 'Abrir link antigo de Salvos', description: 'Leva o dono para /app/saved.', run: () => setParams({ aba: 'salvos' }) },
    { label: 'Ver perfil completo', run: () => navigate('/members/ana-souza') },
    { label: 'Ver perfil sem trajetória', run: () => navigate('/members/leticia-prado') },
    { label: 'Ver perfil de validador', run: () => navigate('/members/diego-ramos') },
    { label: 'Ver perfil privado', run: () => navigate('/members/bruno-lima') },
    { label: 'Ver perfil inexistente', run: () => navigate('/members/ninguem') },
    {
      label: 'Ver como visitante',
      description: 'Remove a sessão de membro.',
      run: () => db.set((s) => ({ ...s, session: null })),
    },
    {
      label: 'Ver como dono do perfil',
      description: 'Entre como ana@he4rt.dev ou bruno@he4rt.dev (senha "password"); o login volta a este perfil.',
      run: () => navigate(`/app/login?redirect=${encodeURIComponent(`/members/${username}`)}`),
    },
  ])

  if (!user) return <NotFound />
  const isOwner = sessionUserId === user.id
  if (isOwner && params.get('aba') === 'salvos') return <Navigate to="/app/saved" replace />
  if (!user.published && !isOwner) {
    return (
      <div className="public-profile-page">
        <Card className="public-profile-page__private-profile">
          <h1>Este perfil é privado</h1>
          <p>O membro ainda não publicou o perfil.</p>
        </Card>
      </div>
    )
  }
  const profile = storedProfile ?? emptyProfile(user.id)
  // "Ver como": the owner reads their profile as a member or a visitor would.
  const viewAs = viewerOptions.find((option) => option.param !== null && option.param === params.get('ver'))?.value
  const viewer: Viewer = isOwner ? (viewAs ?? 'owner') : sessionUserId ? 'member' : 'visitor'
  const asOwner = viewer === 'owner'
  const setViewer = (next: Viewer) =>
    setParams((current) => {
      const result = new URLSearchParams(current)
      const param = viewerOptions.find((option) => option.value === next)?.param
      if (param) result.set('ver', param)
      else result.delete('ver')
      return result
    })

  const graph = trajectoryGraph(profile, { squads, projects, memberships, deliveries, validations, posts, viewer })
  const entries = graph.entries
  // The forum is for the community: visitors do not get the tab.
  const tabs = (Object.keys(TABS) as Tab[]).filter((value) => value !== 'forum' || viewer !== 'visitor')
  const activeTab = tabs.includes(tab) ? tab : 'visao-geral'
  const activity = memberActivity(profile, {
    projects,
    memberships,
    deliveries,
    discussions,
    validations,
    signedIn: viewer !== 'visitor',
  })
  const github = user.linkedAccounts.find((account) => account.provider === 'github')
  const linkedin = user.linkedAccounts.find((account) => account.provider === 'linkedin')
  const links = [
    github && { label: 'GitHub', url: `https://github.com/${github.handle}` },
    linkedin && { label: 'LinkedIn', url: `https://www.linkedin.com/in/${linkedin.handle}` },
    user.portfolioUrl && { label: 'Portfólio', url: user.portfolioUrl },
  ].filter((link) => !!link)
  const validator = validatorRecord
    ? {
        since: validatorRecord.approvedAt,
        role: validatorRecord.showEmployer ? validatorRecord.jobTitle : null,
        company: validatorRecord.showEmployer ? validatorRecord.company : null,
      }
    : null
  // Others read what the member chose to show here; the owner reads all of theirs, marked.
  const shownPosts = posts
    .filter((p) => p.userId === user.id && p.deletedAt === null && (asOwner || p.shownOnProfile))
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
  const publishedValidations = validations
    .filter((v) => v.memberId === user.id && v.status === 'recorded' && v.published)
    .filter((v) => !validations.some((n) => n.supersedesId === v.id && n.status === 'recorded' && n.published))
    .toSorted((a, b) => (b.recordedAt ?? '').localeCompare(a.recordedAt ?? ''))
  const firstName = user.name.split(' ')[0]
  const achievements = shownAchievements(memberAchievements(state, user.id, now), asOwner)

  const trajectory =
    entries.length > 0 ? (
      <TrajectoryGraph graph={graph} forum={{ discussions, isOwner: asOwner }} editorId={asOwner ? user.id : null} />
    ) : asOwner ? (
      <div className="public-profile-page__empty">
        <p className="public-profile-page__empty-title">Sua trajetória ainda não tem registros publicados.</p>
        <p>Registre o que você aprendeu e escolha o que aparece aqui.</p>
      </div>
    ) : (
      <p className="public-profile-page__empty">{firstName} ainda não publicou registros na trajetória.</p>
    )

  return (
    <div className="public-profile-page">
      <ProfileHeader
        userId={user.id}
        name={user.name}
        username={user.username}
        bio={user.bio}
        photoUrl={user.photoUrl}
        links={links}
        validator={validator}
        isOwner={asOwner}
        memberSince={user.createdAt}
        state={user.city?.uf ?? null}
        coverImageUrl={profile.coverImageUrl}
      />
      {activity.facts.length > 0 && <ContributionFacts facts={activity.facts} />}
      {isOwner && !user.published && (
        <Card className="public-profile-page__private">
          <p>Seu perfil está privado: só você vê esta página.</p>
          <Button asChild variant="secondary" size="sm">
            <Link to="/app/settings/profile">Publicar meu perfil</Link>
          </Button>
        </Card>
      )}
      {isOwner && (
        <OwnerNotice missing={missingProfileItems(user, profile, entries.length > 0)} viewer={viewer} onViewerChange={setViewer} />
      )}

      <Tabs value={activeTab} onValueChange={(value) =>
          setParams(() => {
            const next = new URLSearchParams(value === 'visao-geral' ? {} : { aba: value })
            return next
          })
        }>
        <TabsList aria-label="Seções do perfil">
          {tabs.map((value) => (
            <TabsTrigger key={value} value={value}>
              {TABS[value]}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="public-profile-page__grid">
          <div className="public-profile-page__side">
            <ProfileSidebar profile={profile} areas={areaLabels(user.areas)} languages={user.languages} isOwner={asOwner} viewer={viewer} />
            <AchievementsBox
              items={achievements}
              journey={memberJourney(state, user.id)}
              ownerId={asOwner ? user.id : null}
              firstName={firstName}
            />
          </div>

          <div className="public-profile-page__main">
            <TabsContent value="visao-geral" className="public-profile-page__tab">
              <ReadmeCard
                readme={profile.readme}
                empty={asOwner ? 'Conte quem você é no texto "Sobre", em Editar perfil.' : `${firstName} ainda não escreveu o texto "Sobre".`}
              />
              {publishedValidations.length > 0 && (
                <ValidationsCard validations={publishedValidations} projects={projects} contestations={contestations} />
              )}
              <DiaryCard
                posts={shownPosts}
                collections={collections.filter((c) => c.userId === user.id)}
                empty={asOwner ? 'Publique no Feed o que aprendeu; aqui ficam todas as suas publicações.' : `${firstName} ainda não mostrou publicações do diário.`}
                ownerView={asOwner}
              />
            </TabsContent>
            <TabsContent value="trajetoria" className="public-profile-page__tab">
              <Card>{trajectory}</Card>
            </TabsContent>
            {viewer !== 'visitor' && (
              <TabsContent value="forum" className="public-profile-page__tab">
                <Card>
                  <ForumActivity items={activity.forum} firstName={firstName} isOwner={asOwner} />
                </Card>
              </TabsContent>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  )
}
