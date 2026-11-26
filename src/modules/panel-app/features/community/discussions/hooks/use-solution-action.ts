import { useActionState } from 'react'
import { errorMessage } from '@/mocks/mock-action'
import { setDiscussionSolution } from '../actions'

/** Marks or unmarks the reply that solved a discussion, from a form whose submit button carries `replyId`. */
export function useSolutionAction(discussionId: string) {
  return useActionState(async (_previous: { ok: boolean; message: string } | null, data: FormData) => {
    try {
      const replyId = String(data.get('replyId') ?? '') || null
      await setDiscussionSolution({ discussionId, replyId })
      return { ok: true, message: replyId ? 'Solução marcada.' : 'Solução desmarcada.' }
    } catch (error) {
      return { ok: false, message: errorMessage(error) }
    }
  }, null)
}
