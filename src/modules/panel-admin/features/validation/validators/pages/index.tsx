import { useState } from 'react'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { db, useDb } from '@/mocks/db'
import { formatDate, isSuperAdmin } from '@/mocks/squads'
import { openCount, VALIDATOR_WINDOW } from '@/mocks/validation'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import { approveValidator, declineValidator, reinstateValidator, suspendValidator } from '../../actions'
import './index.css'

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
    <div className="validators">
      <div className="validators__head">
        <PageHeader title="Validadores" description="Habilitados a partir de prova técnica. A recusa não é permanente." />
        <FormMessage tone={error ? 'error' : 'success'}>{error ?? success}</FormMessage>
      </div>
      <Card>
        <CardHeader>
          <h2>Pedidos de habilitação ({pendingApps.length})</h2>
        </CardHeader>
        {pendingApps.length === 0 ? (
          <p className="validators__muted">Nenhum pedido esperando.</p>
        ) : (
          <>
            <Field id="decline-reason" label="Retorno da recusa" required hint="Obrigatório para recusar: o que trazer no próximo pedido.">
              <Input id="decline-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <ul className="validators__list">
              {pendingApps.map((a) => (
                <li key={a.id}>
                  <div className="validators__who">
                    <span className="validators__name">{name(a.userId)}</span>
                    <span className="validators__caption">
                      {a.jobTitle} na {a.company}. {a.showEmployer ? 'Mostra a empresa no perfil.' : 'Não mostra a empresa no perfil.'}
                    </span>
                  </div>
                  <p className="validators__summary">{a.summary}</p>
                  <ul className="validators__links">
                    {a.links.map((l) => (
                      <li key={l}>
                        <a href={l} target="_blank" rel="noreferrer" title={l}>
                          {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <div className="validators__actions">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => run(() => approveValidator(admin?.id ?? '', a.id), 'Validador habilitado.')}
                    >
                      Habilitar validador
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
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
        <CardHeader>
          <h2>Habilitados ({state.validators.length})</h2>
        </CardHeader>
        {state.validators.length === 0 ? (
          <p className="validators__muted">Nenhum validador habilitado. Os squads não devem abrir sem validadores.</p>
        ) : (
          <ul className="validators__list">
            {state.validators.map((v) => (
              <li key={v.userId}>
                <div className="validators__row">
                  <div className="validators__who">
                    <span className="validators__name">{name(v.userId)}</span>
                    <span className="validators__caption">
                      {v.jobTitle} na {v.company}, validador desde {formatDate(v.approvedAt)}.
                    </span>
                  </div>
                  <span className="validators__window">
                    {v.suspension && <Badge variant="neutral">Suspenso</Badge>}
                    {openCount(state, v.userId)} de {VALIDATOR_WINDOW} abertas
                  </span>
                </div>
                {v.suspension && <p className="validators__caption">Motivo da suspensão: {v.suspension.reason}</p>}
                {superAdmin && (
                  <div className="validators__actions">
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
