import { track } from '@/mocks/analytics'
import { db, newId, type StartingPoint } from '@/mocks/db'
import { MockError, mockAction } from '@/mocks/mock-action'
import { activeProject, appendLog, githubHandle, isStaff, isSuperAdmin, requireText, RESERVED_SQUAD_SLUGS } from '@/mocks/squads'
import { slugify } from '@/lib/text'

function staff(actorId: string) {
  const actor = db.get().users.find((u) => u.id === actorId)
  if (!isStaff(actor)) throw new MockError('Só a staff faz isso.')
  return actor!
}

function superAdmin(actorId: string) {
  const actor = db.get().users.find((u) => u.id === actorId)
  if (!isSuperAdmin(actor)) throw new MockError('Só o super admin faz isso.')
}

function requireGithub(userId: string) {
  const user = db.get().users.find((u) => u.id === userId)
  if (!user) throw new MockError('Escolha um capitão.', 'captain')
  if (!githubHandle(user)) throw new MockError('O capitão precisa ter o GitHub vinculado.', 'captain')
}

export function createSquad(actorId: string, input: { name: string; description: string; captainId: string }) {
  return mockAction('panel-admin.squads.store', input, () => {
    staff(actorId)
    const name = requireText(input.name, 3, 'O nome precisa de ao menos 3 caracteres.', 'name')
    const description = requireText(input.description, 10, 'Descreva o squad em ao menos 10 caracteres.', 'description')
    const slug = slugify(name, 40)
    if (RESERVED_SQUAD_SLUGS.includes(slug)) throw new MockError('Este nome é reservado. Escolha outro.', 'name')
    if (db.get().squads.some((s) => s.slug === slug)) throw new MockError('Já existe um squad com este nome.', 'name')
    if (input.captainId) requireGithub(input.captainId)
    const id = newId()
    db.set((s) => ({
      ...s,
      squads: [
        ...s.squads,
        { id, slug, name, description, captainId: input.captainId || null, status: 'inactive', createdAt: new Date().toISOString() },
      ],
    }))
    return { slug }
  })
}

export type ProjectInput = {
  name: string
  goal: string
  acceptanceCriteria: string[]
  evaluationCriteria: { competency: string; description: string }[]
  stack: string
  expectedLevel: StartingPoint[]
  seats: number
  captainId: string
  repositoryMode: 'create' | 'link'
  repository: string
}

/** Existing He4rt repositories the App can link; a real install lists them from GitHub. */
export const ORG_REPOSITORIES = ['he4rt/loja-checkout', 'he4rt/loja-catalogo', 'he4rt/agenda', 'he4rt/bot-discord', 'he4rt/hub-design']

export function canCreateProject(squadId: string): boolean {
  return !activeProject(db.get(), squadId)
}

/** The project is born in the Hub with its standard fields; the GitHub App creates or links the repository. */
export function createProject(actorId: string, squadId: string, input: ProjectInput) {
  return mockAction('panel-admin.squads.projects.store', input, () => {
    staff(actorId)
    const state = db.get()
    const squad = state.squads.find((s) => s.id === squadId)
    if (!squad) throw new MockError('Squad não encontrado.')
    if (!canCreateProject(squadId)) throw new MockError('Este squad já tem um projeto ativo.')
    const name = requireText(input.name, 3, 'Dê um nome ao projeto.', 'name')
    const goal = requireText(input.goal, 20, 'Descreva o objetivo final em ao menos 20 caracteres.', 'goal')
    const acceptance = input.acceptanceCriteria.map((c) => c.trim()).filter(Boolean)
    if (acceptance.length === 0) throw new MockError('Inclua ao menos um critério de aceite.', 'acceptance')
    const evaluation = input.evaluationCriteria.filter((c) => c.competency.trim())
    if (evaluation.length === 0) throw new MockError('Inclua ao menos um critério de avaliação.', 'evaluation')
    if (evaluation.some((c) => !c.description.trim())) throw new MockError('Descreva cada critério de avaliação.', 'evaluation')
    const stack = input.stack.split(',').map((t) => t.trim()).filter(Boolean)
    if (stack.length === 0) throw new MockError('Informe a stack.', 'stack')
    if (input.expectedLevel.length === 0) throw new MockError('Escolha ao menos um nível.', 'level')
    if (!Number.isInteger(input.seats) || input.seats < 2 || input.seats > 12) throw new MockError('Entre 2 e 12 lugares.', 'seats')
    const captainId = input.captainId || squad.captainId || ''
    requireGithub(captainId)

    const repo = input.repository.trim().toLowerCase()
    if (!/^he4rt\/[a-z0-9-]+$/.test(repo)) throw new MockError('O repositório fica na organização: he4rt/nome-do-projeto.', 'repository')
    const exists = ORG_REPOSITORIES.includes(repo) || state.projects.some((p) => p.repository?.fullName === repo)
    if (input.repositoryMode === 'create' && exists) throw new MockError('Este repositório já existe. Use "Vincular existente".', 'repository')
    if (input.repositoryMode === 'link' && !exists) throw new MockError('Este repositório não existe na organização.', 'repository')
    if (state.projects.some((p) => p.repository?.fullName === repo && p.status !== 'ended')) {
      throw new MockError('Este repositório já está num projeto ativo.', 'repository')
    }

    const id = newId()
    db.set((s) => ({
      ...s,
      squads: s.squads.map((sq) => (sq.id === squadId ? { ...sq, captainId } : sq)),
      projects: [
        ...s.projects,
        {
          id,
          squadId,
          slug: slugify(name, 40),
          name,
          goal,
          acceptanceCriteria: acceptance.map((text) => ({ id: newId(), text })),
          evaluationCriteria: evaluation.map((c) => ({ id: newId(), competency: c.competency.trim(), description: c.description.trim() })),
          stack,
          expectedLevel: input.expectedLevel,
          seats: input.seats,
          applicationQuestions: [{ id: newId(), text: 'O que você quer praticar neste projeto?', required: true }],
          repository: { fullName: repo, url: `https://github.com/${repo}` },
          board: null,
          status: 'provisioning',
          startedAt: null,
          endedAt: null,
        },
      ],
    }))
    if (squad.captainId !== captainId) {
      appendLog({ squadId, projectId: id, kind: 'captain-changed', actorId, subjectId: captainId })
    }
    track('squad_project_created', { squadId, projectId: id, repositoryMode: input.repositoryMode })
    return { projectId: id }
  })
}

/** Staff allocates a captain to a vacancy; replacing a captain is the super admin's, with a reason. */
export function changeCaptain(actorId: string, squadId: string, captainId: string, reason: string) {
  return mockAction('panel-admin.squads.captain.update', { squadId, captainId, reason }, () => {
    staff(actorId)
    const squad = db.get().squads.find((s) => s.id === squadId)
    if (!squad) throw new MockError('Squad não encontrado.')
    if (squad.captainId) superAdmin(actorId)
    if (squad.captainId === captainId) throw new MockError('Esta pessoa já é a capitã.', 'captain')
    requireGithub(captainId)
    const text = squad.captainId ? requireText(reason, 10, 'Diga o motivo da troca.', 'reason') : reason.trim() || null
    const project = activeProject(db.get(), squadId)
    const now = new Date().toISOString()
    db.set((s) => ({
      ...s,
      squads: s.squads.map((sq) => (sq.id === squadId ? { ...sq, captainId } : sq)),
      memberships:
        project && !s.memberships.some((m) => m.projectId === project.id && m.userId === captainId && m.leftAt === null)
          ? [
              ...s.memberships,
              { id: newId(), squadId, projectId: project.id, userId: captainId, responsibilities: 'Capitão.', joinedAt: now, leftAt: null, leftReason: null, shownOnProfile: false },
            ]
          : s.memberships,
    }))
    appendLog({ squadId, projectId: project?.id ?? null, kind: 'captain-changed', actorId, subjectId: captainId, reason: text })
  })
}

export function removeMember(actorId: string, membershipId: string, reason: string) {
  return mockAction('panel-admin.squads.members.destroy', { membershipId, reason }, () => {
    superAdmin(actorId)
    const m = db.get().memberships.find((x) => x.id === membershipId && x.leftAt === null)
    if (!m) throw new MockError('Participação não encontrada.')
    const text = requireText(reason, 10, 'Diga o motivo, que fica no log do squad.', 'reason')
    db.set((s) => ({
      ...s,
      memberships: s.memberships.map((x) => (x.id === membershipId ? { ...x, leftAt: new Date().toISOString(), leftReason: text } : x)),
      squads: s.squads.map((sq) => (sq.id === m.squadId && sq.captainId === m.userId ? { ...sq, captainId: null } : sq)),
    }))
    appendLog({ squadId: m.squadId, projectId: m.projectId, kind: 'member-removed', actorId, subjectId: m.userId, reason: text })
  })
}

export function reassignMember(actorId: string, membershipId: string, targetSquadId: string, reason: string) {
  return mockAction('panel-admin.squads.members.update', { membershipId, targetSquadId, reason }, () => {
    superAdmin(actorId)
    const state = db.get()
    const m = state.memberships.find((x) => x.id === membershipId && x.leftAt === null)
    if (!m) throw new MockError('Participação não encontrada.')
    const target = activeProject(state, targetSquadId)
    if (!target || target.status !== 'active' || targetSquadId === m.squadId) {
      throw new MockError('Escolha outro squad com projeto ativo.', 'target')
    }
    const text = requireText(reason, 10, 'Diga o motivo, que fica no log dos dois squads.', 'reason')
    const now = new Date().toISOString()
    const targetName = state.squads.find((s) => s.id === targetSquadId)?.name ?? ''
    db.set((s) => ({
      ...s,
      memberships: [
        ...s.memberships.map((x) => (x.id === membershipId ? { ...x, leftAt: now, leftReason: text } : x)),
        { id: newId(), squadId: targetSquadId, projectId: target.id, userId: m.userId, responsibilities: '', joinedAt: now, leftAt: null, leftReason: null, shownOnProfile: m.shownOnProfile },
      ],
    }))
    appendLog({ squadId: m.squadId, projectId: m.projectId, kind: 'member-reassigned', actorId, subjectId: m.userId, detail: `para ${targetName}`, reason: text })
    appendLog({ squadId: targetSquadId, projectId: target.id, kind: 'member-joined', actorId, subjectId: m.userId, reason: text })
  })
}
