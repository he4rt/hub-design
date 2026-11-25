import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { CREST_SHAPES, CREST_SYMBOLS, crestLabel, type Crest } from '@/modules/panel-app/lib/squad-crest'
import './squad-crest.css'

/** No gradient, no patterned cover: the crest is one color, the squad's branch color. */
export function SquadCrest({ crest, size = 'md', className }: { crest: Crest; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const shape = CREST_SHAPES.find((s) => s.id === crest.shape) ?? CREST_SHAPES[0]
  const { Icon } = CREST_SYMBOLS.find((s) => s.id === crest.symbol) ?? CREST_SYMBOLS[0]
  return (
    <span
      role="img"
      aria-label={crestLabel(crest)}
      data-size={size}
      className={cn('squad-crest', className)}
      style={{ '--crest': `var(--lane-${crest.color})` } as CSSProperties}
    >
      <svg viewBox="0 0 48 56" className="squad-crest__shape" aria-hidden>
        <path d={shape.d} />
      </svg>
      <Icon className="squad-crest__symbol" aria-hidden />
    </span>
  )
}
