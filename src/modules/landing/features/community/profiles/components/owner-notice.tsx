import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Viewer } from '@/lib/trajectory/visibility'
import './owner-notice.css'

const READING: Record<Exclude<Viewer, 'owner'>, string> = {
  member: 'Você está vendo como membro.',
  visitor: 'Você está vendo como visitante.',
}

/**
 * Shown only to the profile's owner, and only when there is something to say: that they are reading
 * it as someone else (switched in "Ver como", in the header) or what the profile still lacks.
 */
export function OwnerNotice({
  missing,
  viewer,
  onBack,
}: {
  missing: string[]
  viewer: Viewer
  onBack: () => void
}) {
  if (viewer === 'owner' && missing.length === 0) return null
  return (
    <div className="owner-notice" role="note">
      <Eye size={16} aria-hidden />
      <p className="owner-notice__text">
        {viewer === 'owner'
          ? `Para o perfil contar melhor a sua trajetória, faltam: ${missing.join(', ')}.`
          : READING[viewer]}
      </p>
      {viewer !== 'owner' && (
        <Button variant="secondary" size="sm" onClick={onBack}>
          Voltar
        </Button>
      )}
    </div>
  )
}
