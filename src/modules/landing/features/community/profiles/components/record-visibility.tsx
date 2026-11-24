import { Check, Globe, Lock, Users } from 'lucide-react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useActionRunner } from '@/hooks/use-action-runner'
import type { Visibility } from '@/mocks/db'
import type { RecordCollection } from '@/lib/trajectory/graph'
import { visibilityOptions } from '@/lib/trajectory/visibility'
import { updateRecordVisibility } from '../actions'
import './record-visibility.css'

const ICONS = { private: Lock, community: Users, public: Globe }

/** Shown only to the owner, inside a record: a small control with who sees it. Changes save right away. */
export function RecordVisibility({
  ownerId,
  record,
}: {
  ownerId: string
  record: { collection: RecordCollection; id: string; visibility: Visibility }
}) {
  const { run, pending, error } = useActionRunner()
  const Icon = ICONS[record.visibility]
  const current = visibilityOptions.find((option) => option.value === record.visibility)
  return (
    <div className="record-visibility">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="record-visibility__trigger" loading={pending} aria-label={`Quem vê: ${current?.label}`}>
            <Icon size={14} aria-hidden />
            {current?.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {visibilityOptions.map((option) => {
            const OptionIcon = ICONS[option.value]
            return (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => option.value !== record.visibility && run(() => updateRecordVisibility(ownerId, record.collection, record.id, option.value))}
              >
                <OptionIcon size={16} aria-hidden />
                {option.label}
                <Check size={16} aria-hidden className="record-visibility__check" style={{ visibility: option.value === record.visibility ? 'visible' : 'hidden' }} />
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <FormMessage tone="error">{error}</FormMessage>}
    </div>
  )
}
