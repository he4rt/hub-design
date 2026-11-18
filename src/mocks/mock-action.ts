import { debugStore, logFinish, logStart } from '@/debug/debug-store'

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

/**
 * Runs a mocked backend action: waits the latency set in the debug sidebar,
 * fails when "fail next action" is on, and records the call in the debug log.
 * Every action that would hit the backend goes through here.
 */
export async function mockAction<T>(
  name: string,
  input: unknown,
  handler: () => T | Promise<T>,
): Promise<T> {
  const id = logStart(name, input)
  const { latencyMs, failNext } = debugStore.get()
  await new Promise((resolve) => setTimeout(resolve, latencyMs))

  try {
    if (failNext) {
      debugStore.set((state) => ({ ...state, failNext: false }))
      throw new MockError('Falha simulada pelo painel de debug.')
    }
    const output = await handler()
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
