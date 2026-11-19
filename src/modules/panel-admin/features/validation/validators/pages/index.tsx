import { useState } from 'react'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { db, useDb } from '@/mocks/db'
import { formatDate, isSuperAdmin } from '@/mocks/squads'
import { openCount, VALIDATOR_WINDOW } from '@/mocks/validation'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import { approveValidator, declineValidator, reinstateValidator, suspendValidator } from '../../actions'
import '@/components/stack-page.css'

/** Enablement requests with technical proof, and the enabled validators with their window. */
export default function Index() {
  const admin = useAdmin()
  const state = useDb((s) => s)
  const { run, pending, error, success } = useActionRunner()
  const [reason, setReason] = useState('')
  const name = (id: string) => state.users.find((u) => u.id === id)?.name ?? '?'
  const pendingApps = state.validatorApplications.filter((a) => a.status === 'pending')
  const superAdmin = isSuperAdmin(admin)

  useDebugActions('Validadores', [
    { label: 'Preencher retorno de recusa', run: () => setReason('Traga exemplos de revisão de código que você fez em outros projetos.') },
    { label: 'Sem validadores habilitados', run: () => db.set((s) => ({ ...s, validators: [] })) },
  ])

  return (
    <div className="stack-page">
      <PageHeader title="Validadores" description="Habilitados a partir de prova técnica. A recusa não é permanente." />
      <FormMessage tone={error ? 'error' : 'success'}>{error ?? success}</FormMessage>
      <Card>
        <h2>
          Pedidos de habilitação <span className="stack-page__num">{pendingApps.length}</span>
        </h2>
        {pendingApps.length === 0 ? (
          <p className="stack-page__muted">Nenhum pedido esperando.</p>
        ) : (
          <>
            <Field id="decline-reason" label="Retorno da recusa" hint="Obrigatório para recusar: o que trazer no próximo pedido.">
              <Input id="decline-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <ul className="stack-page__list">
              {pendingApps.map((a) => (
                <li key={a.id}>
                  <div className="stack-page__row">
                    <span className="stack-page__title">{name(a.userId)}</span>
                    <span className="stack-page__muted">
                      {a.jobTitle} na {a.company} · {a.showEmployer ? 'mostra empresa' : 'não mostra empresa'}
                    </span>
                  </div>
                  <p className="stack-page__quote">{a.summary}</p>
                  <p className="stack-page__muted">
                    {a.links.map((l, i) => (
                      <span key={l}>
                        {i > 0 && ' · '}
                        <a href={l} target="_blank" rel="noreferrer">
                          {l}
                        </a>
                      </span>
                    ))}
                  </p>
                  <div className="stack-page__actions">
                    <Button size="sm" disabled={pending} onClick={() => run(() => approveValidator(admin?.id ?? '', a.id), 'Validador habilitado.')}>
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending || reason.trim().length < 30}
                      onClick={() => run(() => declineValidator(admin?.id ?? '', a.id, reason), 'Retorno enviado.')}
                    >
                      Recusar com retorno
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      <Card>
        <h2>Habilitados</h2>
        {state.validators.length === 0 ? (
          <p className="stack-page__muted">Nenhum validador habilitado. Os squads não devem abrir sem validadores.</p>
        ) : (
          <ul className="stack-page__list">
            {state.validators.map((v) => (
              <li key={v.userId}>
                <div className="stack-page__row">
                  <span className="stack-page__title">{name(v.userId)}</span>
                  <span className="stack-page__actions">
                    <span className="stack-page__num">
                      {openCount(state, v.userId)}/{VALIDATOR_WINDOW} abertas
                    </span>
                    {v.suspension && <Badge variant="neutral">Suspenso</Badge>}
                  </span>
                </div>
                <p className="stack-page__muted">
                  {v.jobTitle} na {v.company} · desde {formatDate(v.approvedAt)}
                  {v.suspension && ` · motivo: ${v.suspension.reason}`}
                </p>
                {superAdmin && (
                  <div className="stack-page__actions">
                    {v.suspension ? (
                      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => reinstateValidator(admin?.id ?? '', v.userId), 'Reativado.')}>
                        Reativar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={pending}
                        onClick={() => run(() => suspendValidator(admin?.id ?? '', v.userId, reason), 'Suspenso; pedidos voltaram à fila.')}
                      >
                        Suspender (usa o motivo acima)
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
