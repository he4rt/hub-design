import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { StateChip } from '@/components/state-chip'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Card, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { db, newId, useDb, type Validation } from '@/mocks/db'
import { formatDate } from '@/mocks/squads'
import { evaluationCriterion } from '@/mocks/validation'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { cancelValidationRequest } from '../../requests/actions'
import { canPublish, hasOpenContestation, setValidationPublished } from '../actions'
import '@/components/validation/validation-page.css'

function fakeValidation(memberId: string, insufficient: boolean, i = 0): Validation {
  return {
    id: newId(),
    requestId: 'debug',
    memberId,
    validatorId: 'u9',
    validator: { name: 'Diego Ramos', jobTitle: 'Engenheiro de software', company: 'Empresa Exemplo' },
    projectId: 'p1',
    competency: i % 2 ? 'Revisão de código' : 'Comunicação no time',
    context: 'Gerada pelo painel de debug.',
    contribution: 'Atualizou o board e respondeu às revisões no mesmo dia.',
    strengths: [{ text: 'Descrições de PR claras, com o porquê da mudança.', evidenceRef: 'loja-checkout#34' }],
    improvements: [
      {
        text: insufficient ? 'As entregas não mostram revisão de código feita por você.' : 'Respostas às revisões sem link para o commit que corrige.',
        evidenceRef: 'loja-checkout#34',
        suggestion: 'Responda cada comentário com o commit que resolve.',
      },
    ],
    conflictOfInterest: { declared: false, description: '' },
    insufficientEvidence: insufficient,
    status: 'recorded',
    review: null,
    recordedAt: new Date().toISOString(),
    published: false,
    publishedAt: null,
    supersedesId: null,
  }
}

/** The member's requests and validations; each one is published or kept private by the member. */
export default function Index() {
  const account = useAccount()
  const state = useDb((s) => s)
  const { run, pending, error } = useActionRunner()
  const memberId = account?.id ?? ''
  const requests = state.validationRequests.filter((r) => r.memberId === memberId && (r.status === 'queued' || r.status === 'assigned'))
  const validations = state.validations
    .filter((v) => v.memberId === memberId && v.status === 'recorded')
    .sort((a, b) => (b.recordedAt ?? '').localeCompare(a.recordedAt ?? ''))

  useDebugActions('Minhas validações', [
    { label: 'Receber validação', run: () => db.set((s) => ({ ...s, validations: [...s.validations, fakeValidation(memberId, false)] })) },
    {
      label: 'Receber validação com evidência insuficiente',
      run: () => db.set((s) => ({ ...s, validations: [...s.validations, fakeValidation(memberId, true)] })),
    },
    {
      label: 'Gerar 20 validações',
      run: () =>
        db.set((s) => ({ ...s, validations: [...s.validations, ...Array.from({ length: 20 }, (_, i) => fakeValidation(memberId, false, i))] })),
    },
    {
      label: 'Desligar perfil público',
      run: () => db.set((s) => ({ ...s, users: s.users.map((u) => (u.id === memberId ? { ...u, published: false } : u)) })),
    },
    { label: 'Entrar como Ana', run: () => db.set((s) => ({ ...s, session: { userId: 'u2' } })) },
  ])

  const publishable = canPublish(account?.published ?? false)

  return (
    <div className="validation-page">
      <PageHeader
        title="Minhas validações"
        description="Chegam privadas. Você escolhe quais mostrar no perfil, e cada uma aparece inteira."
        actions={
          <Button asChild variant="secondary">
            <Link to="/app/validation/validator-application">Quero validar</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <h2>Pedidos ({requests.length})</h2>
        </CardHeader>
        {requests.length === 0 ? (
          <p className="validation-page__muted">Nenhum pedido aberto. Peça validação em Meu squad, a partir de uma entrega aceita.</p>
        ) : (
          <ul className="validation-page__list">
            {requests.map((r) => {
              const competency = evaluationCriterion(state, r)?.competency
              return (
                <li key={r.id}>
                  <div className="validation-page__row">
                    <Badge variant="comp">{competency}</Badge>
                    <StateChip entity="validation-request" state={r.status} />
                  </div>
                  <div className="validation-page__row">
                    <p className="validation-page__muted">
                      Projeto {state.projects.find((p) => p.id === r.projectId)?.name}, pedido em {formatDate(r.createdAt)}.
                      Validadores são voluntários; não há prazo prometido.
                    </p>
                    {r.status === 'queued' && (
                      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => cancelValidationRequest(memberId, r.id))}>
                        Cancelar pedido
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <h2>Recebidas ({validations.length})</h2>
        </CardHeader>
        {!publishable && validations.length > 0 && (
          <Callout icon={<ShieldCheck size={16} aria-hidden />}>
            Publicar só com o perfil ligado. <Link to="/app/settings/profile">Ligue o perfil público</Link> para mostrar
            validações.
          </Callout>
        )}
        {validations.length === 0 ? (
          <p className="validation-page__muted">Nenhuma validação ainda.</p>
        ) : (
          <ul className="validation-page__list">
            {validations.map((v) => (
              <li key={v.id}>
                <div className="validation-page__row">
                  <Link to={`/app/validation/${v.id}`} className="validation-page__name" title={v.competency}>
                    {v.competency}
                  </Link>
                  <span className="validation-page__chips">
                    {v.insufficientEvidence && <StateChip entity="validation" state="insufficient-evidence" />}
                    {hasOpenContestation(state.contestations, v.id) && <StateChip entity="contestation" state="open" />}
                  </span>
                </div>
                <p className="validation-page__muted">
                  Registrada por {v.validator.name} em {formatDate(v.recordedAt)}.
                </p>
                <label className="validation-page__check">
                  <Switch
                    checked={v.published}
                    disabled={pending || (!v.published && !publishable)}
                    onCheckedChange={(published) => run(() => setValidationPublished(memberId, v.id, published))}
                  />
                  Mostrar no perfil público
                </label>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <FormMessage tone="error">{error}</FormMessage>
    </div>
  )
}
