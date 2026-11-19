import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { NotFound } from '@/components/not-found'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebugActions } from '@/debug/use-debug-actions'
import { areaLabels } from '@/lib/member-profile'
import { db, useDb, type MemberProfile } from '@/mocks/db'
import { AchievementList } from '../components/achievement-list'
import { AchievementsBox } from '../components/achievements-box'
import { ActivityList } from '../components/activity-list'
import { ContributionFacts } from '../components/contribution-facts'
import { DiaryCard } from '../components/diary-card'
import { JourneyBand } from '../components/journey-band'
import { OwnerNotice } from '../components/owner-notice'
import { ProfileHeader } from '../components/profile-header'
import { ProfileSidebar } from '../components/profile-sidebar'
import { ReadmeCard } from '../components/readme-card'
import { TrajectoryGraph } from '../components/trajectory-graph'
import { ValidationsCard } from '../components/validations-card'
import { achievementsModels, parseAchievementsModel, shownAchievements } from '../lib/achievements'
import { activityGroupLabels, memberActivity, type ActivityGroup } from '../lib/activity'
import { missingProfileItems } from '../lib/completeness'
import { trajectoryGraph } from '../lib/trajectory'
import { viewerOptions, type Viewer } from '../lib/visibility'
import './show.css'

const TABS = { 'visao-geral': 'Visão geral', atividade: 'Atividade', trajetoria: 'Trajetória', conquistas: 'Conquistas' } as const
type Tab = keyof typeof TABS

/** A member who has not registered any trajectory record yet. */
function emptyProfile(userId: string): MemberProfile {
  return {
    userId,
    readme: null,
    currentFocus: null,
    knowledge: [],
    learnings: [],
    experiences: [],
    articles: [],
    evidences: [],
    journey: { stage: 'member', publicStage: 'member', contributor: false },
  }
}

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
  const allAchievements = useDb((db) => db.memberAchievements)

  const tab: Tab = (params.get('aba') as Tab) in TABS ? (params.get('aba') as Tab) : 'visao-geral'
  const tipo = params.get('tipo') as ActivityGroup | null
  const model = parseAchievementsModel(params.get('conquistas'))
  const group = tipo && tipo in activityGroupLabels ? tipo : null

  useDebugActions('Perfil público', [
    { label: 'Abrir Visão geral', run: () => setParams({}) },
    { label: 'Abrir Atividade', run: () => setParams({ aba: 'atividade' }) },
    { label: 'Abrir Trajetória', run: () => setParams({ aba: 'trajetoria' }) },
    ...achievementsModels.map((option) => ({
      label: `Conquistas: ${option.label}`,
      run: () =>
        setParams((next) => {
          next.set('conquistas', option.value)
          return next
        }),
    })),
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
  if (!user.published && !isOwner) {
    return (
      <div className="public-profile-page">
        <Card>
          <h1>Este perfil é privado</h1>
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
  // The Conquistas tab exists only in the "aba" achievements model.
  const tabs = (Object.keys(TABS) as Tab[]).filter((value) => value !== 'conquistas' || model === 'aba')
  const activeTab = tabs.includes(tab) ? tab : 'visao-geral'
  const activity = memberActivity(profile, {
    squads,
    projects,
    memberships,
    deliveries,
    discussions,
    posts,
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
    .filter((v) => !validations.some((n) => n.supersedesId === v.id && n.status === 'recorded'))
    .toSorted((a, b) => (b.recordedAt ?? '').localeCompare(a.recordedAt ?? ''))
  const firstName = user.name.split(' ')[0]
  const achievements = shownAchievements(
    allAchievements.filter((item) => item.userId === profile.userId),
    viewer === 'owner',
  )
  const achievementProps = { items: achievements, journey: profile.journey, isOwner: asOwner, firstName }

  const trajectory =
    entries.length > 0 ? (
      <TrajectoryGraph graph={graph} forum={{ discussions, isOwner: asOwner }} editorId={asOwner ? user.id : null} />
    ) : asOwner ? (
      <div className="public-profile-page__empty">
        <code>fatal: sua trajetória ainda não tem registros publicados</code>
        <p>Registre o que você aprendeu e escolha o que aparece aqui.</p>
      </div>
    ) : (
      <p className="public-profile-page__empty">{firstName} ainda não publicou registros na trajetória.</p>
    )

  return (
    <div className="public-profile-page">
      <ProfileHeader
        name={user.name}
        username={user.username}
        bio={user.bio}
        photoUrl={user.photoUrl}
        links={links}
        validator={validator}
        isOwner={asOwner}
        memberSince={user.createdAt}
        state={user.city?.uf ?? null}
        achievements={model === 'cabecalho' ? achievements : []}
      />
      {model === 'jornada' && <JourneyBand {...achievementProps} />}
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
            if (params.has('conquistas')) next.set('conquistas', model)
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
            {model === 'vitrine' && <AchievementsBox {...achievementProps} />}
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
            <TabsContent value="atividade" className="public-profile-page__tab">
              <Card>
                <ActivityList
                  items={activity.items}
                  group={group}
                  signedIn={Boolean(sessionUserId)}
                  onGroupChange={(next) => setParams(next ? { aba: 'atividade', tipo: next } : { aba: 'atividade' })}
                />
              </Card>
            </TabsContent>
            <TabsContent value="trajetoria" className="public-profile-page__tab">
              <Card>{trajectory}</Card>
            </TabsContent>
            {model === 'aba' && (
              <TabsContent value="conquistas" className="public-profile-page__tab">
                <Card>
                  {achievements.length > 0 ? (
                    <AchievementList items={achievements} />
                  ) : (
                    <p className="public-profile-page__empty">
                      {asOwner ? 'Suas conquistas aparecem aqui conforme você avança.' : `${firstName} ainda não publicou conquistas.`}
                    </p>
                  )}
                </Card>
              </TabsContent>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  )
}
