import { useActionState, useState } from 'react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDebugActions } from '@/debug/use-debug-actions'
import { errorMessage } from '@/mocks/mock-action'
import { replyToDiscussion } from '../actions'
import './reply-form.css'

type Result = { ok: true } | { ok: false; error: string } | null

export function ReplyForm({ discussionId }: { discussionId: string }) {
  const [body, setBody] = useState('')

  const [result, submit, pending] = useActionState(async (): Promise<Result> => {
    try {
      await replyToDiscussion({ discussionId, body })
      setBody('')
      return { ok: true }
    } catch (e) {
      return { ok: false, error: errorMessage(e) }
    }
  }, null)

  useDebugActions('Responder', [
    {
      label: 'Preencher uma resposta válida',
      run: () => setBody('Passei pelo mesmo problema. O que resolveu foi rodar o teste com o worker parado e olhar o log.'),
    },
    { label: 'Preencher resposta curta (erro esperado)', run: () => setBody('Valeu!') },
  ])

  return (
    <form action={submit} className="reply-form">
      <Label htmlFor="reply-body">Sua resposta</Label>
      <Textarea
        id="reply-body"
        rows={4}
        value={body}
        aria-invalid={result?.ok === false ? true : undefined}
        aria-describedby="reply-body-hint"
        onChange={(event) => setBody(event.target.value)}
      />
      <p id="reply-body-hint" className="reply-form__hint">
        Explique o caminho, não só a resposta: quem perguntou está aprendendo.
      </p>
      <div className="reply-form__footer">
        <FormMessage tone={result?.ok === false ? 'error' : 'success'}>
          {result && (result.ok ? 'Resposta publicada.' : result.error)}
        </FormMessage>
        <Button type="submit" loading={pending}>
          Responder
        </Button>
      </div>
    </form>
  )
}
