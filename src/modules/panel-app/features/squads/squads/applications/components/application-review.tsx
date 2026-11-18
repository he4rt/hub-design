import { useActionState, useState } from 'react'
import { Link } from 'react-router'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { LEVEL_LABELS, formatDate } from '@/mocks/squads'
import type { MockDb, SquadApplication } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { acceptApplication, canAccept, declineApplication, FEEDBACK_MIN, saveApplicationNotes } from '../actions'
import './application-review.css'

type Result = { tone: 'error' | 'success'; text: string } | null

/**
 * Everything the captain weighs about one applicant: answers, profile,
 * entry test and past squads, the notes the applicant will read, and the
 * decision. A decline cannot be sent without why and what to strengthen.
 */
export function ApplicationReview({ state, application, actorId }: { state: MockDb; application: SquadApplication; actorId: string }) {
  const user = state.users.find((u) => u.id === application.userId)
  const project = state.teamProjects.find((p) => p.id === application.projectId)
  const test = state.entryTests.find((t) => t.userId === application.userId)
  const pastSquads = state.memberships.filter((m) => m.userId === application.userId)
  const [strengths, setStrengths] = useState(application.notes?.strengths ?? '')
  const [improvements, setImprovements] = useState(application.notes?.improvements ?? '')
  const [reason, setReason] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const decided = application.status !== 'pending'

  const [notesResult, saveNotes, savingNotes] = useActionState(async (): Promise<Result> => {
    try {
      await saveApplicationNotes(actorId, application.id, { strengths, improvements })
      return { tone: 'success', text: 'Anotações salvas. A pessoa já pode lê-las.' }
    } catch (e) {
      return { tone: 'error', text: errorMessage(e) }
    }
  }, null)

  const [decisionResult, decide, deciding] = useActionState(async (_: Result, form: FormData): Promise<Result> => {
    try {
      if (form.get('intent') === 'accept') await acceptApplication(actorId, application.id)
      else await declineApplication(actorId, application.id, { reason, nextSteps })
      return null
    } catch (e) {
      return { tone: 'error', text: errorMessage(e) }
    }
  }, null)

  const feedbackReady = reason.trim().length >= FEEDBACK_MIN && nextSteps.trim().length >= FEEDBACK_MIN
  const acceptable = canAccept(state, application.id)

  return (
    <div className="application-review">
      <header className="stack-page__row">
        <div>
          <p className="stack-page__title">{user?.name}</p>
          <p className="stack-page__muted">
            {user?.startingPoint && LEVEL_LABELS[user.startingPoint]} · {user?.languages.join(', ')}
          </p>
        </div>
        {user?.published && (
          <Button asChild variant="secondary" size="sm">
            <Link to={`/members/${user.username}`} target="_blank">
              Ver perfil
            </Link>
          </Button>
        )}
      </header>

      <section>
        <h3>Respostas</h3>
        {project?.applicationQuestions.map((q) => (
          <div key={q.id} className="application-review__answer">
            <p className="stack-page__muted">{q.text}</p>
            <p className="stack-page__quote">{application.answers.find((a) => a.questionId === q.id)?.answer || 'Sem resposta.'}</p>
          </div>
        ))}
      </section>

      <section>
        <h3>Trajetória no Hub</h3>
        <ul className="stack-page__muted">
          <li>
            Teste de entrada:{' '}
            {test ? (
              <a href={test.pullRequest.url} target="_blank" rel="noreferrer">
                {test.pullRequest.repository}#{test.pullRequest.number}
              </a>
            ) : (
              'não encontrado'
            )}
            {test?.approvedAt && `, merged em ${formatDate(test.approvedAt)}`}
          </li>
          <li>
            Squads: {pastSquads.length === 0 ? 'primeiro squad' : pastSquads.map((m) => state.squadTeams.find((s) => s.id === m.squadId)?.name).join(', ')}
          </li>
          {user?.bio && <li>{user.bio}</li>}
        </ul>
      </section>

      <form action={saveNotes} className="application-review__form">
        <h3>Anotações</h3>
        <p className="stack-page__muted">A pessoa, você e a staff leem. Fale do que observou, não da pessoa.</p>
        <Field id="strengths" label="Pontos fortes">
          <Textarea id="strengths" value={strengths} onChange={(e) => setStrengths(e.target.value)} />
        </Field>
        <Field id="improvements" label="Pontos de melhoria">
          <Textarea id="improvements" value={improvements} onChange={(e) => setImprovements(e.target.value)} />
        </Field>
        <FormMessage tone={notesResult?.tone ?? 'success'}>{notesResult?.text}</FormMessage>
        <div className="stack-page__actions">
          <Button type="submit" variant="secondary" loading={savingNotes} disabled={deciding}>
            Salvar anotações
          </Button>
        </div>
      </form>

      {decided ? (
        <p className="stack-page__muted">
          <Badge tone={application.status === 'accepted' ? 'success' : 'neutral'}>
            {application.status === 'accepted' ? 'Aceita' : application.status === 'declined' ? 'Recusada' : 'Retirada'}
          </Badge>{' '}
          {application.status === 'accepted' &&
            (application.githubInvite === 'pending' ? 'Convite do GitHub pendente.' : 'Já está no squad.')}
          {application.decision && ` Retorno enviado em ${formatDate(application.decision.decidedAt)}.`}
        </p>
      ) : (
        <form action={decide} className="application-review__form">
          <h3>Decisão</h3>
          <Button type="submit" name="intent" value="accept" loading={deciding} disabled={!acceptable || savingNotes}>
            Aceitar e dar acesso ao repositório
          </Button>
          {!acceptable && <p className="stack-page__muted">Sem lugares livres neste projeto.</p>}
          <p className="stack-page__muted">
            Para recusar, escreva o retorno. Um não sozinho nunca é enviado: mínimo de {FEEDBACK_MIN} caracteres em cada campo.
          </p>
          <Field id="reason" label="Por que agora não" hint={<span className="stack-page__num">{reason.trim().length}/{FEEDBACK_MIN}</span>}>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Field
            id="next-steps"
            label="O que fortalecer para a próxima"
            hint={<span className="stack-page__num">{nextSteps.trim().length}/{FEEDBACK_MIN}</span>}
          >
            <Textarea id="next-steps" value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
          </Field>
          <FormMessage tone="error">{decisionResult?.text}</FormMessage>
          <div className="stack-page__actions">
            <Button type="submit" name="intent" value="decline" variant="danger" disabled={!feedbackReady || deciding || savingNotes}>
              Recusar com retorno
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
