import type { ComponentProps, ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { Slot, Switch as SwitchPrimitive, Tabs as TabsPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

/*
 * Base components of the "Técnico × Traçado" lab. Same roles as src/components/ui, drawn in the new
 * language; they only exist inside /design-lab.
 */

export function Button({
  variant = 'secondary',
  size = 'default',
  loading = false,
  pressed,
  disabled,
  asChild = false,
  className,
  children,
  ...props
}: ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'icon'
  size?: 'default' | 'compact'
  loading?: boolean
  pressed?: boolean
  /** Renders the child (such as a `Link`) with the button's look. */
  asChild?: boolean
}) {
  if (asChild) {
    return (
      <Slot.Root data-variant={variant} data-size={size} className={cn('tx-btn', className)} {...props}>
        {children}
      </Slot.Root>
    )
  }
  return (
    <button
      type="button"
      data-variant={variant}
      data-size={size}
      data-pressed={pressed}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn('tx-btn', className)}
      {...props}
    >
      {loading && <span className="tx-btn__spin" aria-hidden />}
      {children}
    </button>
  )
}

export function Chip({ tone = 'tag', children }: { tone?: 'success' | 'warning' | 'info' | 'neutral' | 'comp' | 'brand' | 'tag'; children: ReactNode }) {
  return (
    <span className="tx-chip" data-tone={tone}>
      {children}
    </span>
  )
}

export function Count({ value, label }: { value: number; label: string }) {
  return (
    <span className="tx-count" aria-label={label}>
      {value}
    </span>
  )
}

/** A record on a line. The shape carries the state, never the color alone. */
export function Node({ kind }: { kind: 'done' | 'pending' | 'current' | 'validated' | 'future' }) {
  return <span className="tx-node" data-kind={kind} aria-hidden />
}

/** The arc of a person: initials, top-left corner rounded. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const words = name.trim().split(/\s+/)
  const initials = ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase()
  return (
    <span className="tx-avatar" data-size={size} aria-hidden>
      {initials}
    </span>
  )
}

/** Label always above the control; an aside on the right for what helps, such as "Opcional". */
export function Field({
  id,
  label,
  aside,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  aside?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="tx-field">
      <label htmlFor={id} className="tx-field__label">
        {label}
      </label>
      {aside ? <span className="tx-field__aside">{aside}</span> : <span />}
      {children}
      {(error || hint) && (
        <p id={`${id}-hint`} className="tx-field__hint" data-tone={error ? 'error' : undefined}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

/** How close a text is to the minimum the reader needs, as a line that fills. */
export function Meter({ length, min }: { length: number; min: number }) {
  return (
    <div className="tx-meter" aria-live="polite">
      <span className="tx-meter__track" aria-hidden>
        <span style={{ width: `${Math.min(length / min, 1) * 100}%` }} />
      </span>
      <span>{length >= min ? `${length} caracteres` : `${length} de ${min} caracteres mínimos`}</span>
    </div>
  )
}

export function Switch(props: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root className="tx-switch" {...props}>
      <SwitchPrimitive.Thumb className="tx-switch__thumb" />
    </SwitchPrimitive.Root>
  )
}

export function Tabs({ tabs, label, defaultValue }: { tabs: { value: string; label: string; content: ReactNode }[]; label: string; defaultValue: string }) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue} className="tx-tabs">
      <TabsPrimitive.List className="tx-tabs__list" aria-label={label}>
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger key={tab.value} value={tab.value} className="tx-tabs__trigger">
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content key={tab.value} value={tab.value} className="tx-tabs__content">
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}

/** Progress as steps on a line: what happened is solid, what has not is dashed. */
export function Steps({ value, total, label }: { value: number; total: number; label: string }) {
  return (
    <div className="tx-steps">
      <div className="tx-steps__track" role="img" aria-label={label}>
        {Array.from({ length: total }, (_, i) => (
          <StepNode key={i} index={i} value={value} last={i === total - 1} />
        ))}
      </div>
      {/* The plain bar of the Técnico variant; the track above is the Traçado version. */}
      <div className="tx-steps__bar" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} data-on={i < value || undefined} />
        ))}
      </div>
      <span className="tx-meta">{label}</span>
    </div>
  )
}

function StepNode({ index, value, last }: { index: number; value: number; last: boolean }) {
  return (
    <>
      <Node kind={index < value ? 'done' : 'future'} />
      {!last && <i data-future={index + 1 >= value || undefined} />}
    </>
  )
}

const NOTE = {
  info: { icon: Info, label: 'Regra' },
  warning: { icon: TriangleAlert, label: 'Atenção' },
  danger: { icon: CircleAlert, label: 'Não deu certo' },
  success: { icon: CircleCheck, label: 'Registrado' },
}

/** An alert as a margin note: a rule in the state's color, the kind on the left, the text on the right. */
export function Note({ tone = 'info', title, children }: { tone?: keyof typeof NOTE; title: string; children: ReactNode }) {
  const { icon: Icon, label } = NOTE[tone]
  return (
    <div className="tx-note" data-tone={tone} role={tone === 'danger' ? 'alert' : undefined}>
      <span className="tx-note__kind tx-label">
        <Icon strokeWidth={1.75} aria-hidden />
        {label}
      </span>
      <p className="tx-note__body">
        <strong>{title}</strong>
        {children}
      </p>
    </div>
  )
}

/** A figure of the manual: the specimen and its numbered caption. */
export function Figure({ n, title, note, span, children }: { n: string; title: string; note: string; span: number; children: ReactNode }) {
  return (
    <figure className={`tx-fig tx-span-${span}`}>
      {children}
      <figcaption className="tx-fig__cap">
        <span className="tx-index">{n}</span>
        <span>
          <b>{title}</b> <span className="tx-fig__note">{note}</span>
        </span>
      </figcaption>
    </figure>
  )
}

/** "Carregar mais" while the list has more than it shows; the last item fades into it (txf-more). */
export function More({ total, limit, onMore }: { total: number; limit: number; onMore: () => void }) {
  if (total <= limit) return null
  return (
    <div className="txf-more txp-more">
      <Button onClick={onMore}>Carregar mais</Button>
    </div>
  )
}
