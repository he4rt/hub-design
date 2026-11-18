import { useNavigate, useParams } from 'react-router'
import { NotFound } from '@/components/not-found'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb } from '@/mocks/db'
import { ContributionsShowcase } from '../components/contributions-showcase'
import { OwnerNotice } from '../components/owner-notice'
import { ProfileHeader } from '../components/profile-header'
import { ProfileSidebar } from '../components/profile-sidebar'
import { ReadmeCard } from '../components/readme-card'
import { TrajectoryGraph } from '../components/trajectory-graph'
import { missingProfileItems } from '../lib/completeness'
import { trajectoryEntries } from '../lib/trajectory'
import './show.css'

/** Public profile: readable without login, only what the member chose to publish. */
export default function PublicProfile() {
  const { handle } = useParams()
  const navigate = useNavigate()
  const profile = useDb((db) => db.profiles.find((p) => p.handle === handle))
  const user = useDb((db) => db.users.find((u) => u.id === profile?.userId))
  const sessionUserId = useDb((db) => db.session?.userId)
  const squads = useDb((db) => db.squads)
  const projects = useDb((db) => db.projects)
  const discussions = useDb((db) => db.discussions)

  useDebugActions('Perfil público', [
    { label: 'Ver perfil completo', run: () => navigate('/app/members/ana-souza') },
    { label: 'Ver perfil incompleto', run: () => navigate('/app/members/bruno-lima') },
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
  const contributions = [
    ...entries.filter((entry) => entry.kind === 'project'),
    ...entries.filter((entry) => entry.kind === 'evidence'),
  ]
  const isOwner = sessionUserId === profile.userId
  const firstName = user.name.split(' ')[0]

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
      <div className="public-profile-page__banner" />
      <div className="public-profile-page__content">
        {isOwner && (
          <OwnerNotice missing={missingProfileItems(profile, entries.length > 0)} />
        )}
        <ProfileHeader name={user.name} photoUrl={user.photoUrl} profile={profile} isOwner={isOwner} />
        {contributions.length > 0 && <ContributionsShowcase entries={contributions} />}

        <div className="public-profile-page__grid">
          <ProfileSidebar profile={profile} />

          <Card className="public-profile-page__main">
            {profile.readme ? (
              <Tabs defaultValue="trajectory">
                <TabsList aria-label="Seções do perfil">
                  <TabsTrigger value="trajectory">Trajetória</TabsTrigger>
                  <TabsTrigger value="about">Sobre</TabsTrigger>
                </TabsList>
                <TabsContent value="trajectory" className="public-profile-page__tab">
                  {trajectory}
                </TabsContent>
                <TabsContent value="about" className="public-profile-page__tab">
                  <ReadmeCard handle={profile.handle} readme={profile.readme} />
                </TabsContent>
              </Tabs>
            ) : (
              <>
                <h2 className="public-profile-page__heading">Trajetória</h2>
                {trajectory}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
