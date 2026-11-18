import { useId, useState, type ComponentProps, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'
import { normalizeText } from '@/lib/text'
import { Input } from './input'
import './combobox.css'

export type ComboboxOption = { value: string; label: string }

type ComboboxProps = Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
  options: ComboboxOption[]
  value: string | null
  onValueChange: (value: string | null) => void
  /** Most suggestions shown at once. */
  limit?: number
  emptyText?: string
}

/** Text field that suggests matching options as you type: Radix has no combobox primitive. */
export function Combobox({
  options,
  value,
  onValueChange,
  limit = 8,
  emptyText = 'Nada encontrado.',
  className,
  ...props
}: ComboboxProps) {
  const listId = useId()
  // null shows the selected option's label; text means the person is typing.
  const [query, setQuery] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const selected = options.find((option) => option.value === value)
  const matches = (
    query ? options.filter((option) => normalizeText(option.label).includes(normalizeText(query))) : options
  ).slice(0, limit)
  const active = Math.min(activeIndex, matches.length - 1)

  function choose(option: ComboboxOption) {
    onValueChange(option.value)
    setQuery(null)
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setOpen(true)
      setActiveIndex(Math.max(0, Math.min(active + step, matches.length - 1)))
    } else if (event.key === 'Enter' && open) {
      // Picks the suggestion instead of submitting the form.
      event.preventDefault()
      if (matches[active]) choose(matches[active])
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className={cn('ui-combobox', className)}>
      <Input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={query ?? selected?.label ?? ''}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(0)
          setOpen(true)
          if (value !== null) onValueChange(null)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          setQuery(null)
        }}
        onKeyDown={onKeyDown}
        {...props}
      />
      {open && (
        <ul id={listId} role="listbox" className="ui-combobox__list">
          {matches.length === 0 ? (
            <li className="ui-combobox__empty">{emptyText}</li>
          ) : (
            matches.map((option, index) => (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className="ui-combobox__option"
                // Keeps the focus in the input, so blur does not close the list before the click.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
