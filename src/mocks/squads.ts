import { db, newId, type MockDb, type Squad, type SquadLogEntry, type Project, type SquadApplication, type User } from './db'
import { MockError } from './mock-action'

/**
 * Policies and queries of squads and validation, like the models and policies
 * of the Laravel app. Actions enforce them; screens read the same functions to
 * hide or disable what an action would refuse.
 */

export const ROLE_LABELS: Record<User['role'], string> = {
  member: 'Membro',
  admin: 'Staff',
  'super-admin': 'Super admin',
}

export function isStaff(user: User | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'super-admin'
}

export function isSuperAdmin(user: User | null | undefined): boolean {
  return user?.role === 'super-admin'
}

export function githubHandle(user: User | null | undefined): string | null {
  return user?.linkedAccounts.find((account) => account.provider === 'github')?.handle ?? null
}

export function activeProject(state: MockDb, squadId: string): Project | undefined {
  return state.projects.find((project) => project.squadId === squadId && project.status !== 'ended')
}

export function activeMemberships(state: MockDb, projectId: string) {
  return state.memberships.filter((m) => m.projectId === projectId && m.leftAt === null)
}

/** Accepted invitations reserve capacity without exposing their candidates to other viewers. */
export function reservedSeats(state: MockDb, projectId: string): number {
  const active = new Set(activeMemberships(state, projectId).map((m) => m.userId))
  return new Set(state.applications.filter((a) => a.projectId === projectId && a.status === 'accepted' && a.githubInvite === 'pending' && !active.has(a.userId)).map((a) => a.userId)).size
}

export function freeSeats(state: MockDb, project: Project): number {
  return Math.max(0, project.seats - activeMemberships(state, project.id).length - (project.reservedSeats ?? reservedSeats(state, project.id)))
}

export function isCaptain(squad: Squad | undefined, userId: string | undefined): boolean {
  return !!squad && !!userId && squad.captainId === userId
}

/** Captain of the squad, or the super admin, who can do everything. */
export function canManageSquad(state: MockDb, squadId: string, userId: string | undefined): boolean {
  const squad = state.squads.find((s) => s.id === squadId)
  const user = state.users.find((u) => u.id === userId)
  return isCaptain(squad, userId) || isSuperAdmin(user)
}

export function hasApprovedEntryTest(state: MockDb, userId: string): boolean {
  return state.entryTests.some((test) => test.userId === userId && test.status === 'approved')
}

/** Why the member cannot apply to the project now, or null when they can. */
export function applyBlocker(state: MockDb, userId: string, project: Project): string | null {
  const user = state.users.find((u) => u.id === userId)
  if (!githubHandle(user)) return 'Vincule o GitHub para participar de squads.'
  if (!hasApprovedEntryTest(state, userId)) return 'Conclua o teste de entrada antes de se candidatar.'
  if (project.status !== 'active') return 'Este projeto não está recebendo candidaturas.'
  if (activeMemberships(state, project.id).some((m) => m.userId === userId)) return 'Você já está neste projeto.'
  if (state.applications.some((a) => a.projectId === project.id && a.userId === userId && (a.status === 'pending' || (a.status === 'accepted' && a.githubInvite === 'pending')))) {
    return 'Você já tem uma candidatura ou convite aguardando confirmação.'
  }
  if (freeSeats(state, project) <= 0) return 'O projeto está sem lugares livres.'
  return null
}

/** The application that says most about where the member is: invite pending, then pending, then the latest decline. */
export function currentApplication(state: MockDb, userId: string): SquadApplication | undefined {
  const mine = state.applications
    .filter((a) => a.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    mine.find((a) => a.status === 'accepted' && a.githubInvite === 'pending') ??
    mine.find((a) => a.status === 'pending') ??
    mine.find((a) => a.status === 'declined')
  )
}

/** Squad ids where the member is active right now. */
export function activeSquadIds(state: MockDb, userId: string): string[] {
  return [...new Set(state.memberships.filter((m) => m.userId === userId && m.leftAt === null).map((m) => m.squadId))]
}

export function logEntry(entry: Omit<SquadLogEntry, 'id' | 'at' | 'detail' | 'reason' | 'subjectId'> &
  Partial<Pick<SquadLogEntry, 'detail' | 'reason' | 'subjectId'>>): SquadLogEntry {
  return { detail: null, reason: null, subjectId: null, ...entry, id: newId(), at: new Date().toISOString() }
}

export function appendLog(entry: Parameters<typeof logEntry>[0]) {
  db.set((state) => ({ ...state, squadLog: [...state.squadLog, logEntry(entry)] }))
}

const BLOCKED_WORDS = ['burro', 'burra', 'preguiçoso', 'preguiçosa', 'idiota', 'incompetente', 'lixo', 'inútil']

/**
 * Automatic moderation of text another member reads. Personal or offensive
 * wording is sent back for rewriting before anything is saved.
 */
export function moderate(text: string, field?: string) {
  const lower = text.toLowerCase()
  const word = BLOCKED_WORDS.find((w) => lower.includes(w))
  if (word) throw new MockError('Reescreva sem adjetivos sobre a pessoa: fale do trabalho e da evidência.', field)
}

export function requireText(text: string, min: number, message: string, field?: string): string {
  const value = text.trim()
  if (value.length < min) throw new MockError(message, field)
  moderate(value, field)
  return value
}

export function findSquadBySlug(state: MockDb, slug: string | undefined) {
  return state.squads.find((squad) => squad.slug === slug)
}

export function userName(state: MockDb, userId: string | null | undefined): string {
  return state.users.find((u) => u.id === userId)?.name ?? 'Membro removido'
}

/** Slugs that share `/app/squads/` with a squad slug. */
export const RESERVED_SQUAD_SLUGS = ['applications', 'entry-test', 'create', 'entry-tests']

export const LOG_LABELS: Record<SquadLogEntry['kind'], string> = {
  'project-started': 'Projeto iniciado',
  'project-ended': 'Projeto encerrado',
  'member-joined': 'Entrou no squad',
  'member-left': 'Saiu do squad',
  'member-removed': 'Retirado do squad',
  'member-reassigned': 'Realocado para outro squad',
  'captain-changed': 'Novo capitão',
  'delivery-accepted': 'Entrega aceita',
}

export const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Iniciante',
  junior: 'Júnior',
  mid: 'Pleno',
  senior: 'Sênior',
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
