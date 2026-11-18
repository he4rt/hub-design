import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { newPoint, type PointRow } from '../actions'
import './points-editor.css'


/** Editable list of points; each one cites its evidence, and points to improve carry a suggestion. */
export function PointsEditor({
  legend,
  rows,
  onChange,
  evidence,
  withSuggestion,
}: {
  legend: string
  rows: PointRow[]
  onChange: (rows: PointRow[]) => void
  evidence: string[]
  withSuggestion?: boolean
}) {
  const update = (rowId: string, patch: Partial<PointRow>) => onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)))
  return (
    <fieldset className="points-editor">
      <legend>{legend}</legend>
      {rows.map((row, i) => (
        <div key={row.rowId} className="points-editor__row">
          <Textarea aria-label={`${legend} ${i + 1}`} placeholder="O que você observou no trabalho" value={row.text} onChange={(e) => update(row.rowId, { text: e.target.value })} />
          <Input
            aria-label={`Evidência de ${legend.toLowerCase()} ${i + 1}`}
            placeholder={`Evidência, por exemplo ${evidence[0] ?? 'repo#12'}`}
            list="validation-evidence"
            value={row.evidenceRef}
            onChange={(e) => update(row.rowId, { evidenceRef: e.target.value })}
          />
          {withSuggestion && (
            <Input
              aria-label={`Sugestão ${i + 1}`}
              placeholder="Sugestão do que fazer"
              value={row.suggestion}
              onChange={(e) => update(row.rowId, { suggestion: e.target.value })}
            />
          )}
          {rows.length > 1 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(rows.filter((r) => r.rowId !== row.rowId))}>
              Remover
            </Button>
          )}
        </div>
      ))}
      <div>
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...rows, newPoint()])}>
          Adicionar
        </Button>
      </div>
    </fieldset>
  )
}
