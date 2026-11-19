import { Eye } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { viewerOptions, type Viewer } from '@/lib/trajectory/visibility'
import './owner-notice.css'

const READING: Record<Viewer, string> = {
  owner: 'Você vê tudo, inclusive o que é só seu, e escolhe quem vê cada registro.',
  member: 'Assim um membro logado vê o seu perfil: o que é da comunidade e o que é público.',
  visitor: 'Assim um visitante sem conta vê o seu perfil: só o que é público.',
}

/**
 * Shown only to the profile's owner, above the page: "Ver como" switches between their own view
 * and what a member or a visitor sees, plus what is still missing. Visitors never see the gaps.
 */
export function OwnerNotice({
  missing,
  viewer,
  onViewerChange,
}: {
  missing: string[]
  viewer: Viewer
  onViewerChange: (viewer: Viewer) => void
}) {
  return (
    <div className="owner-notice" role="note">
      <Eye size={16} aria-hidden />
      <div className="owner-notice__text">
        <p>
          <strong>Só você vê este aviso.</strong> {READING[viewer]}
          {missing.length > 0 && ` Para o perfil contar melhor a sua trajetória, faltam: ${missing.join(', ')}.`}
        </p>
        <div className="owner-notice__view">
          <span id="owner-notice-view">Ver como</span>
          <ToggleGroup
            type="single"
            value={viewer}
            aria-labelledby="owner-notice-view"
            onValueChange={(next) => next && onViewerChange(next as Viewer)}
          >
            {viewerOptions.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </div>
  )
}
