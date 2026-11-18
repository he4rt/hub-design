import { useState, useTransition } from 'react'
import { errorMessage } from '@/mocks/mock-action'

/**
 * Runs mocked actions from buttons: one at a time, with the pending state
 * for `<Button loading>` and the error of the last run for `<FormMessage>`.
 */
export function useActionRunner() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<unknown>, onSuccess?: string | (() => void)) {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        await action()
        if (typeof onSuccess === 'string') setSuccess(onSuccess)
        else onSuccess?.()
      } catch (e) {
        setError(errorMessage(e))
      }
    })
  }

  return { run, pending, error, success }
}
