import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { ProjectSummary } from '@/components/squads/project-summary'
import { SquadLog } from '@/components/squads/squad-log'
import { StateChip } from '@/components/state-chip'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { db, useDb } from '@/mocks/db'
import { projectProvisioned } from '@/mocks/github'
import { activeMemberships, activeProject, findSquadBySlug, formatDate, isSuperAdmin } from '@/mocks/squads'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import { canCreateProject, changeCaptain, reassignMember, removeMember } from '../actions'
import { CaptainField } from '../components/captain-field'
import '@/components/stack-page.css'

/** Squad in the admin: projects, members and log. Removing, reassigning and replacing the captain are the super admin's. */
export default function Show() {
  const { squad: slug } = useParams()
  const admin = useAdmin()
  const state = useDb((s) => s)
  const squad = findSquadBySlug(state, slug)
  const { run, pending, error, success } = useActionRunner()
  const [captainId, setCaptainId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [target, setTarget] = useState('')

  useDebugActions('Squad (admin)', [
    {
      label: 'GitHub confirma o projeto em criação',
      run: () => {
        const p = state.projects.find((x) => x.squadId === squad?.id && x.status === 'provisioning')
        run(() => projectProvisioned(p?.id ?? 'nenhum'))
      },
    },
    { label: 'Preencher motivo', run: () => setReason('Inativo há dois meses, sem resposta no Discord.') },
    {
      label: 'Entrar como Marina (staff, não super admin)',
      run: () => db.set((s) => ({ ...s, adminSession: { userId: 'u8' } })),
    },
    { label: 'Entrar como Daniel (super admin)', run: () => db.set((s) => ({ ...s, adminSession: { userId: 'u1' } })) },
  ])

  if (!squad || !admin) return <NotFound />

  const superAdmin = isSuperAdmin(admin)
  const project = activeProject(state, squad.id)
  const members = project ? activeMemberships(state, project.id) : []
  const otherSquads = state.squads.filter((s) => s.id !== squad.id && activeProject(state, s.id)?.status === 'active')
  const canChangeCaptain = !squad.captainId || superAdmin

  return (
    <div className="stack-page">
      <PageHeader
        title={squad.name}
        description={squad.description}
        actions={
          <span className="stack-page__actions">
            <Button asChild variant="secondary">
              <Link to={`/squads/${squad.slug}`}>Página pública</Link>
            </Button>
            {canCreateProject(squad.id) && (
              <Button asChild>
                <Link to={`/admin/squads/${squad.slug}/projects/create`}>Novo projeto</Link>
              </Button>
            )}
          </span>
        }
      />
      <FormMessage tone={error ? 'error' : 'success'}>{error ?? success}</FormMessage>

      <Card>
        <div className="stack-page__row">
          <h2>{project ? `Projeto: ${project.name}` : 'Sem projeto ativo'}</h2>
          {project && (
            <StateChip entity="project" state={project.status} />
          )}
        </div>
        {project ? (
          <ProjectSummary project={project} />
        ) : (
          <p className="stack-page__muted">O squad está inativo. Encaminhe um projeto para ativá-lo.</p>
        )}
      </Card>

      <Card>
        <h2>Capitão</h2>
        <p>{state.users.find((u) => u.id === squad.captainId)?.name ?? 'Vacancy: sem capitão.'}</p>
        {canChangeCaptain ? (
          <div className="stack-page">
            <CaptainField value={captainId} onChange={setCaptainId} />
            {squad.captainId && (
              <Field id="captain-reason" label="Motivo da troca" hint="Fica no log do squad.">
                <Input id="captain-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
            )}
            <div className="stack-page__actions">
              <Button
                loading={pending}
                disabled={!captainId}
                onClick={() => run(() => changeCaptain(admin.id, squad.id, captainId ?? '', reason), 'Capitão atualizado.')}
              >
                {squad.captainId ? 'Trocar capitão' : 'Alocar capitão'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="stack-page__muted">Trocar o capitão é com o super admin.</p>
        )}
      </Card>

      <Card>
        <h2>Membros</h2>
        {members.length === 0 ? (
          <p className="stack-page__muted">Nenhum membro ativo.</p>
        ) : (
          <>
            {superAdmin && (
              <div className="stack-page">
                <Field id="member-reason" label="Motivo" hint="Obrigatório para tirar ou realocar; fica no log com o seu nome.">
                  <Input id="member-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
                <Field id="target" label="Realocar para">
                  <Combobox
                    id="target"
                    options={otherSquads.map((sq) => ({ value: sq.id, label: sq.name }))}
                    value={target || null}
                    onValueChange={(v) => setTarget(v ?? '')}
                    placeholder="Squad com projeto ativo"
                    emptyText="Nenhum outro squad com projeto ativo."
                  />
                </Field>
              </div>
            )}
            <ul className="stack-page__list">
              {members.map((m) => (
                <li key={m.id}>
                  <div className="stack-page__row">
                    <span className="stack-page__title">
                      {state.users.find((u) => u.id === m.userId)?.name}
                      {m.userId === squad.captainId && ' (capitão)'}
                    </span>
                    <span className="stack-page__muted stack-page__num">desde {formatDate(m.joinedAt)}</span>
                  </div>
                  {superAdmin && (
                    <div className="stack-page__actions">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pending || !target}
                        onClick={() => run(() => reassignMember(admin.id, m.id, target, reason), 'Membro realocado.')}
                      >
                        Realocar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={pending}
                        onClick={() => run(() => removeMember(admin.id, m.id, reason), 'Membro retirado.')}
                      >
                        Tirar do squad
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card>
        <h2>Log do squad</h2>
        <SquadLog entries={state.squadLog.filter((e) => e.squadId === squad.id)} projects={state.projects} users={state.users} />
      </Card>
    </div>
  )
}
