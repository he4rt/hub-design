import { useState, useTransition } from 'react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDb } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { COLLECTION_NAME_MAX, createCollection } from '../actions'
import './collection-picker.css'

/**
 * Picks which of the member's collections a publication is in, and creates a new
 * one in place. Optional: a publication can be in several collections or none.
 */
export function CollectionPicker({
  userId,
  value,
  onChange,
  disabled = false,
}: {
  userId: string
  value: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const all = useDb((state) => state.feedCollections)
  const collections = all.filter((c) => c.userId === userId)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creating, startCreating] = useTransition()

  function create() {
    startCreating(async () => {
      try {
        const collection = await createCollection(userId, name)
        onChange([...value, collection.id])
        setName('')
        setError(null)
      } catch (e) {
        setError(errorMessage(e))
      }
    })
  }

  return (
    <div className="collection-picker">
      {collections.length > 0 ? (
        <ToggleGroup
          type="multiple"
          variant="chips"
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          aria-label="Trilhas"
        >
          {collections.map((c) => (
            <ToggleGroupItem key={c.id} value={c.id} title={c.name} className="collection-picker__chip">
              {c.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : (
        <p className="collection-picker__hint">Você ainda não tem trilhas. Crie uma para juntar o que aprende sobre um tema.</p>
      )}
      <div className="collection-picker__new">
        <Input
          aria-label="Nome da nova trilha"
          placeholder="Nova trilha, como IA aplicada"
          value={name}
          maxLength={COLLECTION_NAME_MAX + 10}
          disabled={disabled}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              create()
            }
          }}
        />
        <Button type="button" variant="secondary" loading={creating} disabled={disabled} onClick={create}>
          Criar
        </Button>
      </div>
      <FormMessage tone="error">{error}</FormMessage>
    </div>
  )
}
