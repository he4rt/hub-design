import { useActionState, useState } from 'react'
import { Pencil } from 'lucide-react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { errorMessage } from '@/mocks/mock-action'
import { LEARNING_NOW_MAX, updateLearningNow } from '../actions'
import './learning-now.css'

/**
 * "Aprendendo agora" in the side column, like dev.to's "Currently learning". The owner changes it
 * right there; visitors only read it, and it is gone when empty.
 */
export function LearningNow({ text, ownerId }: { text: string | null; ownerId: string | null }) {
  const [open, setOpen] = useState(false)
  if (!text && !ownerId) return null

  return (
    <div className="learning-now">
      <div className="learning-now__head">
        <h2>Aprendendo agora</h2>
        {ownerId && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className="learning-now__edit" aria-label="Trocar o que você está aprendendo">
              <Pencil size={14} aria-hidden />
            </PopoverTrigger>
            <PopoverContent align="start">
              <LearningForm userId={ownerId} text={text} onDone={() => setOpen(false)} />
            </PopoverContent>
          </Popover>
        )}
      </div>
      {text ? (
        <p className="learning-now__text">{text}</p>
      ) : (
        <p className="learning-now__empty">Conte o que você está estudando.</p>
      )}
    </div>
  )
}

function LearningForm({ userId, text, onDone }: { userId: string; text: string | null; onDone: () => void }) {
  const [value, setValue] = useState(text ?? '')
  const [error, submit, pending] = useActionState(async () => {
    try {
      await updateLearningNow(userId, value)
      onDone()
      return null
    } catch (e) {
      return errorMessage(e)
    }
  }, null)

  return (
    <form action={submit} className="learning-now__form">
      <label htmlFor="learning-now" className="learning-now__label">
        O que você está aprendendo agora?
      </label>
      <Input
        id="learning-now"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={LEARNING_NOW_MAX}
        placeholder="Ex.: filas e testes de integração em Laravel"
        autoFocus
      />
      <p className="learning-now__hint">
        Deixe em branco para tirar do perfil.
        <span>
          {value.trim().length}/{LEARNING_NOW_MAX}
        </span>
      </p>
      <FormMessage tone="error">{error}</FormMessage>
      <div className="learning-now__actions">
        <Button type="button" variant="secondary" size="sm" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          Salvar
        </Button>
      </div>
    </form>
  )
}
