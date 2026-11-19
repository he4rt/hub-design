import { FormMessage } from '@/components/form-message'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useActionRunner } from '@/hooks/use-action-runner'
import type { Visibility } from '@/mocks/db'
import type { RecordCollection } from '@/lib/trajectory/graph'
import { visibilityOptions } from '@/lib/trajectory/visibility'
import { updateRecordVisibility } from '../actions'
import './record-visibility.css'

/** Shown only to the owner, inside a record: who sees it. Changes save right away. */
export function RecordVisibility({
  ownerId,
  record,
}: {
  ownerId: string
  record: { collection: RecordCollection; id: string; visibility: Visibility }
}) {
  const { run, pending, error } = useActionRunner()
  return (
    <div className="record-visibility">
      <span className="record-visibility__label" id={`visibility-${record.id}`}>
        Quem vê
      </span>
      <ToggleGroup
        type="single"
        value={record.visibility}
        disabled={pending}
        aria-labelledby={`visibility-${record.id}`}
        onValueChange={(next) =>
          next && next !== record.visibility && run(() => updateRecordVisibility(ownerId, record.collection, record.id, next as Visibility))
        }
      >
        {visibilityOptions.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <FormMessage tone="error">{error}</FormMessage>
    </div>
  )
}
