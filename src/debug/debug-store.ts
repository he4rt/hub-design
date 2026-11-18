import { createStore } from '@/lib/store'

export type DebugAction = {
  label: string
  description?: string
  run: () => unknown
}

export type DebugActionGroup = {
  title: string
  actions: DebugAction[]
}

export type DebugLogEntry = {
  id: number
  name: string
  status: 'pending' | 'success' | 'error'
  startedAt: number
  durationMs?: number
  input?: unknown
  output?: unknown
  error?: string
}

type DebugState = {
  open: boolean
  latencyMs: number
  failNext: boolean
  groups: Record<string, DebugActionGroup>
  log: DebugLogEntry[]
}

const LOG_LIMIT = 100

export const debugStore = createStore<DebugState>({
  open: true,
  latencyMs: 300,
  failNext: false,
  groups: {},
  log: [],
})

export function setDebugGroup(id: string, group: DebugActionGroup | null) {
  debugStore.set((state) => {
    const groups = { ...state.groups }
    if (group) groups[id] = group
    else delete groups[id]
    return { ...state, groups }
  })
}

let nextLogId = 1

export function logStart(name: string, input: unknown): number {
  const id = nextLogId++
  const entry: DebugLogEntry = { id, name, status: 'pending', startedAt: Date.now(), input }
  debugStore.set((state) => ({ ...state, log: [entry, ...state.log].slice(0, LOG_LIMIT) }))
  return id
}

export function logFinish(id: number, result: Pick<DebugLogEntry, 'status' | 'output' | 'error'>) {
  debugStore.set((state) => ({
    ...state,
    log: state.log.map((entry) =>
      entry.id === id ? { ...entry, ...result, durationMs: Date.now() - entry.startedAt } : entry,
    ),
  }))
}
