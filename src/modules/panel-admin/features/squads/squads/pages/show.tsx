import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Field } from '@/components/field'
import { FormMessage } from '@/components/form-message'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { ProjectSummary } from '@/components/squads/project-summary'
import { StateChip } from '@/components/state-chip'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { TrailLog, TrailLogItem } from '@/components/ui/trail-log'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useActionRunner } from '@/hooks/use-action-runner'
import { db, useDb, type SquadLogEntry } from '@/mocks/db'
import { projectProvisioned } from '@/mocks/github'
import { activeMemberships, activeProject, findSquadBySlug, formatDate, isSuperAdmin, LOG_LABELS } from '@/mocks/squads'
import { useAdmin } from '@/modules/panel-admin/hooks/use-admin'
import { canCreateProject, changeCaptain, reassignMember, removeMember } from '../actions'
import { CaptainField } from '../components/captain-field'
import './show.css'

/** Dot color of each log entry: accepted in success, joined or started in movement, the rest as past. */
const LOG_TONES: Record<SquadLogEntry['kind'], 'success' | 'move' | 'past'> = {
  'project-started': 'move',
  'project-ended': 'past',
  'member-joined': 'move',
  'member-left': 'past',
  'member-removed': 'past',
  'member-reassigned': 'past',
  'captain-changed': 'move',
  'delivery-accepted': 'success',
}

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

  const captain = state.users.find((u) => u.id === squad.captainId)
  const userName = (id: string | null) => state.users.find((u) => u.id === id)?.name ?? 'Membro removido'
  const log = state.squadLog.filter((e) => e.squadId === squad.id).sort((a, b) => b.at.localeCompare(a.at))

  return (
    <div className="admin-squad">
      <div className="admin-squad__head">
        <PageHeader
          title={squad.name}
          description={squad.description}
          actions={
            <span className="admin-squad__actions">
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
      </div>

      <Card>
        <CardHeader>
          <h2 className="admin-squad__truncate">{project ? project.name : 'Sem projeto ativo'}</h2>
          {project ? <StateChip entity="project" state={project.status} /> : <StateChip entity="squad" state={squad.status} />}
        </CardHeader>
        {project ? (
          <ProjectSummary project={project} />
        ) : (
          <p className="admin-squad__muted">O squad está inativo. Encaminhe um projeto para ativá-lo.</p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <h2>Capitão</h2>
          {!captain && <StateChip entity="squad" state="vacancy" />}
        </CardHeader>
        {captain ? (
          <div className="admin-squad__person">
            <Avatar src={captain.photoUrl} name={captain.name} size="sm" />
            <span className="admin-squad__name">{captain.name}</span>
          </div>
        ) : (
          <p className="admin-squad__muted">O squad está sem capitão. Aloque alguém com o GitHub vinculado.</p>
        )}
        {canChangeCaptain ? (
          <div className="admin-squad__form">
            <CaptainField value={captainId} onChange={setCaptainId} />
            {squad.captainId && (
              <Field id="captain-reason" label="Motivo da troca" hint="Fica no log do squad.">
                <Input id="captain-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
            )}
            <div className="admin-squad__actions">
              <Button
                variant="secondary"
                loading={pending}
                disabled={!captainId}
                onClick={() => run(() => changeCaptain(admin.id, squad.id, captainId ?? '', reason), 'Capitão atualizado.')}
              >
                {squad.captainId ? 'Trocar capitão' : 'Alocar capitão'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="admin-squad__muted">Trocar o capitão é com o super admin.</p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <h2>Membros ({members.length})</h2>
        </CardHeader>
        {members.length === 0 ? (
          <p className="admin-squad__muted">Nenhum membro ativo.</p>
        ) : (
          <>
            {superAdmin && (
              <div className="admin-squad__form">
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
            <ul className="admin-squad__list">
              {members.map((m) => {
                const user = state.users.find((u) => u.id === m.userId)
                return (
                  <li key={m.id}>
                    <div className="admin-squad__person">
                      <Avatar src={user?.photoUrl ?? null} name={user?.name ?? '?'} size="sm" />
                      <div className="admin-squad__who">
                        <span className="admin-squad__name" title={user?.name}>
                          {user?.name}
                        </span>
                        <span className="admin-squad__caption">No squad desde {formatDate(m.joinedAt)}.</span>
                      </div>
                      {m.userId === squad.captainId && <Badge>Capitão</Badge>}
                    </div>
                    {superAdmin && (
                      <div className="admin-squad__actions">
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
                )
              })}
            </ul>
          </>
        )}
      </Card>

      <Card>
        <CardHeader>
          <h2>Log do squad</h2>
        </CardHeader>
        {log.length === 0 ? (
          <p className="admin-squad__muted">Nada registrado ainda.</p>
        ) : (
          <TrailLog>
            {log.map((entry) => (
              <TrailLogItem
                key={entry.id}
                tone={LOG_TONES[entry.kind]}
                title={entry.subjectId ? `${LOG_LABELS[entry.kind]}: ${userName(entry.subjectId)}` : LOG_LABELS[entry.kind]}
                meta={`${state.projects.find((p) => p.id === entry.projectId)?.name ?? 'Squad'}, por ${userName(entry.actorId)} em ${formatDate(entry.at)}.`}
              >
                {entry.detail && <p className="admin-squad__log-text">{entry.detail}</p>}
                {entry.reason && <p className="admin-squad__log-text">Motivo: {entry.reason}</p>}
              </TrailLogItem>
            ))}
          </TrailLog>
        )}
      </Card>
    </div>
  )
}
