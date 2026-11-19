import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDb, type Squad, type Project } from '@/mocks/db'
import { activeMemberships, applyBlocker, githubHandle, hasApprovedEntryTest } from '@/mocks/squads'
import './apply-call.css'

/** "Candidatar-se" for the visitor or member, pointing to the step they are missing. */
export function ApplyCall({ squad, project }: { squad: Squad; project: Project }) {
  const state = useDb((s) => s)
  const userId = state.session?.userId
  const here = `/squads/${squad.slug}`

  if (project.status !== 'active') return null

  let text: string
  let action: { label: string; to: string } | null = null
  if (!userId) {
    text = 'Entre no Hub para se candidatar a este projeto.'
    action = { label: 'Entrar para se candidatar', to: `/app/login?redirect=${encodeURIComponent(here)}` }
  } else if (activeMemberships(state, project.id).some((m) => m.userId === userId)) {
    text = 'Você faz parte deste projeto.'
    action = { label: 'Abrir meu squad', to: `/app/squads/${squad.slug}` }
  } else if (!githubHandle(state.users.find((u) => u.id === userId)) || !hasApprovedEntryTest(state, userId)) {
    text = 'Para se candidatar, faça antes o teste de entrada: um PR merged num repositório da He4rt.'
    action = { label: 'Fazer o teste de entrada', to: '/app/squads/entry-test' }
  } else {
    const blocker = applyBlocker(state, userId, project)
    if (blocker) {
      text = blocker
      if (blocker.includes('aguardando')) action = { label: 'Ver minhas candidaturas', to: '/app/squads/applications' }
    } else {
      text = 'O capitão lê cada candidatura e responde a todas, aceitando ou explicando o porquê.'
      action = {
        label: 'Candidatar-se',
        to: `/app/squads/${squad.slug}/projects/${project.slug}/applications/create`,
      }
    }
  }

  return (
    <Card className="apply-call">
      <p>{text}</p>
      {action && (
        <Button asChild>
          <Link to={action.to}>{action.label}</Link>
        </Button>
      )}
    </Card>
  )
}
