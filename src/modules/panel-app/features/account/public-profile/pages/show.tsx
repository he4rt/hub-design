import { useNavigate, useParams, useSearchParams } from 'react-router'
import { NotFound } from '@/components/not-found'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb } from '@/mocks/db'
import { AchievementList } from '../components/achievement-list'
import { AchievementsBox } from '../components/achievements-box'
import { ActivityList } from '../components/activity-list'
import { ContributionFacts } from '../components/contribution-facts'
import { JourneyBand } from '../components/journey-band'
import { OwnerNotice } from '../components/owner-notice'
import { ProfileHeader } from '../components/profile-header'
import { ProfileSidebar } from '../components/profile-sidebar'
import { ReadmeCard } from '../components/readme-card'
import { TrajectoryGraph } from '../components/trajectory-graph'
import { achievementsModels, parseAchievementsModel, shownAchievements } from '../lib/achievements'
import { activityGroupLabels, memberActivity, type ActivityGroup } from '../lib/activity'
import { missingProfileItems } from '../lib/completeness'
import { trajectoryEntries } from '../lib/trajectory'
import './show.css'

const TABS = { 'visao-geral': 'Visão geral', atividade: 'Atividade', trajetoria: 'Trajetória', conquistas: 'Conquistas' } as const
type Tab = keyof typeof TABS

/**
 * Public profile in three tabs, after Stack Overflow's Profile, Activity and Story: who the
 * member is, what they did on the platform, and how they evolved. Readable without login.
 */
export default function PublicProfile() {
  const { handle } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const profile = useDb((db) => db.profiles.find((p) => p.handle === handle))
  const user = useDb((db) => db.users.find((u) => u.id === profile?.userId))
  const sessionUserId = useDb((db) => db.session?.userId)
  const squads = useDb((db) => db.squads)
  const projects = useDb((db) => db.projects)
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
    { label: 'Ver perfil completo', run: () => navigate('/app/members/ana-souza') },
    { label: 'Ver perfil incompleto', run: () => navigate('/app/members/bruno-lima') },
    { label: 'Ver perfil de validador', run: () => navigate('/app/members/rafael-costa') },
    { label: 'Ver perfil inexistente ou desligado', run: () => navigate('/app/members/ninguem') },
    {
      label: 'Ver como dono do perfil',
      description: 'Entre como ana@he4rt.dev ou bruno@he4rt.dev (senha "password"); o login volta a este perfil.',
      run: () => navigate(`/app/login?redirect=${encodeURIComponent(`/app/members/${handle}`)}`),
    },
  ])

  // A missing profile and a profile turned off look the same, so the link never reveals an account.
  if (!profile || !user) return <NotFound />

  const entries = trajectoryEntries(profile, { squads, projects })
  const isOwner = sessionUserId === profile.userId
  // The Conquistas tab exists only in the "aba" achievements model.
  const tabs = (Object.keys(TABS) as Tab[]).filter((value) => value !== 'conquistas' || model === 'aba')
  const activeTab = tabs.includes(tab) ? tab : 'visao-geral'
  const activity = memberActivity(profile, { squads, projects, discussions, signedIn: Boolean(sessionUserId) })
  const firstName = user.name.split(' ')[0]
  const achievements = shownAchievements(
    allAchievements.filter((item) => item.userId === profile.userId),
    isOwner,
  )
  const achievementProps = { items: achievements, journey: profile.journey, isOwner, firstName }

  const trajectory =
    entries.length > 0 ? (
      <TrajectoryGraph entries={entries} forum={{ discussions, isOwner }} />
    ) : isOwner ? (
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
        photoUrl={user.photoUrl}
        profile={profile}
        isOwner={isOwner}
        memberSince={user.createdAt}
        state={user.city?.uf ?? null}
        achievements={model === 'cabecalho' ? achievements : []}
      />
      {model === 'jornada' && <JourneyBand {...achievementProps} />}
      {isOwner && <OwnerNotice missing={missingProfileItems(profile, entries.length > 0)} />}

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
            <ProfileSidebar profile={profile} isOwner={isOwner} />
            {model === 'vitrine' && <AchievementsBox {...achievementProps} />}
          </div>

          <div className="public-profile-page__main">
            <TabsContent value="visao-geral" className="public-profile-page__tab">
              {activity.facts.length > 0 && <ContributionFacts facts={activity.facts} />}
              <ReadmeCard
                readme={profile.readme}
                empty={isOwner ? 'Conte quem você é no texto "Sobre", em Editar perfil.' : `${firstName} ainda não escreveu o texto "Sobre".`}
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
                      {isOwner ? 'Suas conquistas aparecem aqui conforme você avança.' : `${firstName} ainda não publicou conquistas.`}
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
