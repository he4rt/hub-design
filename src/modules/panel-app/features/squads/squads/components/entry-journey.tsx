import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { TrailLog, TrailLogItem } from '@/components/ui/trail-log'
import type { MockDb } from '@/mocks/db'
import { currentApplication, formatDate } from '@/mocks/squads'

type Tone = 'success' | 'move' | 'warning' | 'past'
type Step = { tone: Tone; title: string; meta: string }
type Next = { text: string; label: string; to: string; external?: boolean }

/**
 * The two layers of entering a squad as one trail: where the member is, what to do now
 * and what happens next. It only reads the states the actions already keep.
 */
export function EntryJourney({ state, userId }: { state: MockDb; userId: string }) {
  const test = state.entryTests.find((t) => t.userId === userId)
  const app = currentApplication(state, userId)
  const project = state.projects.find((p) => p.id === app?.projectId)
  const squad = state.squads.find((s) => s.id === project?.squadId)
  const where = project && squad ? `${project.name}, squad ${squad.name}` : ''
  const approved = test?.status === 'approved'
  const inviting = app?.status === 'accepted' && app.githubInvite === 'pending'

  const testStep: Step = !test
    ? { tone: 'move', title: 'Teste de entrada', meta: 'Você ainda não abriu um PR num repositório da He4rt.' }
    : test.status === 'open'
      ? { tone: 'move', title: 'Teste de entrada', meta: `PR aberto em ${formatDate(test.openedAt)}, esperando a revisão da staff.` }
      : test.status === 'closed'
        ? { tone: 'warning', title: 'Teste de entrada', meta: 'O PR foi fechado sem merge. Leia os comentários e abra outro.' }
        : { tone: 'success', title: 'Teste de entrada aprovado', meta: `Merged em ${formatDate(test.approvedAt)}. Vale para qualquer squad.` }

  const applicationStep: Step = !approved
    ? { tone: 'past', title: 'Candidatura', meta: 'Com o teste aprovado, você escolhe um projeto e responde às perguntas do capitão.' }
    : !app
      ? { tone: 'move', title: 'Candidatura', meta: 'Escolha um projeto com lugar livre e responda às perguntas do capitão.' }
      : app.status === 'pending'
        ? { tone: 'move', title: 'Candidatura enviada', meta: `${where}. O capitão responde a todas, aceitando ou explicando o porquê.` }
        : app.status === 'declined'
          ? { tone: 'warning', title: 'Candidatura recusada com retorno', meta: `${where}. Leia o retorno do capitão; você pode se candidatar de novo.` }
          : { tone: 'success', title: 'Candidatura aceita', meta: `${where}. O capitão aceitou a sua candidatura.` }

  const inviteStep: Step = inviting
    ? { tone: 'move', title: 'Convite do GitHub', meta: 'Aceite o convite da organização He4rt para ter acesso ao repositório e ao board.' }
    : { tone: 'past', title: 'Convite do GitHub', meta: 'Quando o capitão aceita, a He4rt te convida no GitHub.' }

  const joinStep: Step = {
    tone: 'past',
    title: 'Entrada no squad',
    meta: 'Com o convite aceito, você entra no squad e o board aparece em Meu squad.',
  }

  const next: Next =
    !test || test.status === 'closed'
      ? { text: 'Abra um PR num repositório da He4rt. O Hub encontra o PR sozinho.', label: 'Fazer o teste de entrada', to: '/app/squads/entry-test' }
      : test.status === 'open'
        ? {
            text: 'Agora é com a staff: alguém revisa e conversa com você nos comentários do PR. O merge libera a candidatura.',
            label: 'Ver meu teste',
            to: '/app/squads/entry-test',
          }
        : inviting
          ? {
              text: 'Aceite o convite no GitHub. Assim que ele for aceito, você entra no squad.',
              label: 'Aceitar o convite no GitHub',
              to: 'https://github.com/orgs/he4rt/invitation',
              external: true,
            }
          : app?.status === 'pending'
            ? {
                text: 'Agora é com o capitão. Quando ele decidir, a resposta aparece em Minhas candidaturas.',
                label: 'Ver minhas candidaturas',
                to: '/app/squads/applications',
              }
            : app?.status === 'declined'
              ? {
                  text: 'Leia o que fortalecer e candidate-se de novo quando quiser.',
                  label: 'Ler o retorno',
                  to: '/app/squads/applications',
                }
              : { text: 'Escolha um projeto e responda às perguntas do capitão.', label: 'Ver squads ativos', to: '/squads?status=active' }

  return (
    <Card>
      <CardHeader>
        <h2>Sua entrada num squad</h2>
      </CardHeader>
      <TrailLog>
        {[testStep, applicationStep, inviteStep, joinStep].map((step) => (
          <TrailLogItem key={step.title} tone={step.tone} title={step.title} meta={step.meta} />
        ))}
      </TrailLog>
      <div className="squad-page__row">
        <p>{next.text}</p>
        <Button asChild>
          {next.external ? (
            <a href={next.to} target="_blank" rel="noreferrer">
              {next.label}
            </a>
          ) : (
            <Link to={next.to}>{next.label}</Link>
          )}
        </Button>
      </div>
    </Card>
  )
}
