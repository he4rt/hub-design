import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SquadCrest } from '@/modules/panel-app/components/squad-crest'
import { CREST_COLORS, CREST_SHAPES, CREST_SYMBOLS, type Crest } from '@/modules/panel-app/lib/squad-crest'
import './crest-editor.css'

/** Picks the shape, the symbol and the color of a crest, with a live preview of how the squad shows up. */
export function CrestEditor({ crest, name, caption, onChange }: { crest: Crest; name: string; caption: string; onChange: (crest: Crest) => void }) {
  return (
    <div className="crest-editor">
      <div className="crest-editor__preview" aria-live="polite">
        <SquadCrest crest={crest} size="lg" />
        <span className="crest-editor__name" title={name}>
          {name || 'Squad sem nome'}
        </span>
        <span className="crest-editor__caption">{caption}</span>
      </div>
      <div className="crest-editor__pickers">
        <fieldset className="crest-editor__group">
          <legend>Forma</legend>
          <ToggleGroup
            type="single"
            variant="chips"
            aria-label="Forma"
            value={crest.shape}
            onValueChange={(v) => v && onChange({ ...crest, shape: v as Crest['shape'] })}
            className="crest-editor__options"
          >
            {CREST_SHAPES.map((s) => (
              <ToggleGroupItem key={s.id} value={s.id} aria-label={s.label} title={s.label} className="crest-editor__tile">
                <SquadCrest crest={{ ...crest, shape: s.id }} size="sm" />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>
        <fieldset className="crest-editor__group">
          <legend>Símbolo</legend>
          <ToggleGroup
            type="single"
            variant="chips"
            aria-label="Símbolo"
            value={crest.symbol}
            onValueChange={(v) => v && onChange({ ...crest, symbol: v })}
            className="crest-editor__options"
          >
            {CREST_SYMBOLS.map(({ id, label, Icon }) => (
              <ToggleGroupItem key={id} value={id} aria-label={label} title={label} className="crest-editor__tile">
                <Icon size={20} aria-hidden style={{ color: `var(--lane-${crest.color})` }} />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>
        <fieldset className="crest-editor__group">
          <legend>Cor</legend>
          <ToggleGroup
            type="single"
            variant="chips"
            aria-label="Cor"
            value={String(crest.color)}
            onValueChange={(v) => v && onChange({ ...crest, color: Number(v) })}
            className="crest-editor__options"
          >
            {CREST_COLORS.map((c) => (
              <ToggleGroupItem key={c.id} value={String(c.id)} className="crest-editor__color">
                <span className="crest-editor__swatch" style={{ background: `var(--lane-${c.id})` }} aria-hidden />
                {c.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="crest-editor__hint">A mesma cor do ramo do squad na trajetória. Outro squad pode usar a mesma.</p>
        </fieldset>
      </div>
    </div>
  )
}
