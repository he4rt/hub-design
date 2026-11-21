import { debugStore, logFinish, logStart } from '@/debug/debug-store'
import { callServer } from './api'

/**
 * Expected failure of a mocked action, such as a validation error. `field`
 * names the invalid input, like a Laravel validation error key.
 */
export class MockError extends Error {
  field?: string

  constructor(message: string, field?: string) {
    super(message)
    this.field = field
  }
}

/** Set by the API (server/) before it loads the action modules: there the handler runs for real. */
const onServer = (globalThis as { __HUB_SERVER__?: boolean }).__HUB_SERVER__ === true

/**
 * Runs a backend action. In the browser it waits the latency set in the debug sidebar, fails when
 * "fail next action" is on, records the call in the debug log, and sends it to the API, which runs
 * this same handler against the database and answers with the new state. On the API it runs the
 * handler. Every action that would hit the backend goes through here.
 */
export async function mockAction<T>(
  name: string,
  input: unknown,
  handler: () => T | Promise<T>,
): Promise<T> {
  if (onServer) return handler()
  const call = callServer(name)
  const id = logStart(name, input)
  const { latencyMs, failNext } = debugStore.get()
  await new Promise((resolve) => setTimeout(resolve, latencyMs))

  try {
    if (failNext) {
      debugStore.set((state) => ({ ...state, failNext: false }))
      throw new MockError('Falha simulada pelo painel de debug.')
    }
    const output = (await call()) as T
    logFinish(id, { status: 'success', output })
    return output
  } catch (error) {
    logFinish(id, { status: 'error', error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

/** Message to show the user for a failed mocked action. */
export function errorMessage(error: unknown): string {
  return error instanceof MockError ? error.message : 'Algo deu errado.'
}
