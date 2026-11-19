import { Badge } from '@/components/ui/badge'
import type {
  Contestation,
  EntryTest,
  Project,
  Squad,
  SquadApplication,
  SquadDelivery,
  Validation,
  ValidationRequest,
  ValidatorApplication,
} from '@/mocks/db'

type Family = 'success' | 'warning' | 'info' | 'neutral'

/**
 * Every domain state with its chip family and text, from the design system's "Estados e chips".
 * A state never changes family between screens.
 */
const STATES = {
  squad: {
    active: ['success', 'Ativo'],
    inactive: ['neutral', 'Inativo'],
    vacancy: ['warning', 'Sem capitão'],
  },
  project: {
    provisioning: ['neutral', 'Preparando'],
    active: ['success', 'Ativo'],
    ended: ['neutral', 'Encerrado'],
  },
  'entry-test': {
    open: ['info', 'Aguardando revisão'],
    approved: ['success', 'Teste aprovado'],
    closed: ['neutral', 'Fechado sem merge'],
  },
  application: {
    pending: ['warning', 'Pendente'],
    accepted: ['success', 'Aceita'],
    declined: ['neutral', 'Recusada com retorno'],
    withdrawn: ['neutral', 'Retirada'],
  },
  delivery: {
    pending: ['warning', 'Pendente'],
    accepted: ['success', 'Aceita'],
    returned: ['warning', 'Devolvida'],
  },
  'validation-request': {
    queued: ['neutral', 'Na fila'],
    assigned: ['info', 'Atribuído a um validador'],
    recorded: ['success', 'Registrada'],
    cancelled: ['neutral', 'Cancelado'],
  },
  validation: {
    draft: ['neutral', 'Rascunho'],
    'in-review': ['warning', 'Em revisão do admin'],
    recorded: ['success', 'Registrada'],
    'insufficient-evidence': ['neutral', 'Evidência insuficiente'],
  },
  contestation: {
    open: ['warning', 'Revisão em andamento'],
    upheld: ['neutral', 'Mantida'],
    corrected: ['success', 'Corrigida'],
  },
  'validator-application': {
    pending: ['warning', 'Pendente'],
    approved: ['success', 'Aprovada'],
    declined: ['neutral', 'Recusada com retorno'],
  },
} satisfies Record<string, Record<string, readonly [Family, string]>>

type States = {
  squad: Squad['status'] | 'vacancy'
  project: Project['status']
  'entry-test': EntryTest['status']
  application: SquadApplication['status']
  delivery: SquadDelivery['status']
  'validation-request': ValidationRequest['status']
  validation: Validation['status'] | 'insufficient-evidence'
  contestation: Contestation['status']
  'validator-application': ValidatorApplication['status']
}

/** The chip of a domain state, with the family and text every screen uses for it. */
export function StateChip<E extends keyof States>({ entity, state }: { entity: E; state: States[E] }) {
  const [family, label] = (STATES[entity] as Record<string, readonly [Family, string]>)[state]
  return <Badge variant={family}>{label}</Badge>
}
