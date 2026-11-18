import { Eye } from 'lucide-react'
import './owner-notice.css'

/**
 * Shown only to the profile's owner, above the page: this is what visitors see, and what is
 * still missing. Visitors never see the gaps of an incomplete profile.
 */
export function OwnerNotice({ missing }: { missing: string[] }) {
  return (
    <p className="owner-notice" role="note">
      <Eye size={16} aria-hidden />
      <span>
        <strong>Só você vê este aviso.</strong> Este é o seu perfil como um visitante vê.
        {missing.length > 0 && ` Para ele contar melhor a sua trajetória, faltam: ${missing.join(', ')}.`}
      </span>
    </p>
  )
}
