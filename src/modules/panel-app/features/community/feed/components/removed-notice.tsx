import { ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Callout } from '@/components/ui/callout'
import { formatFullDate } from '@/lib/feed-post'
import './removed-notice.css'

/**
 * What the author sees where their text was, after the staff removed it: that it left the Feed and
 * why. Never who removed it; the other members just stop seeing it.
 */
export function RemovedNotice({ what, createdAt, reason }: { what: string; createdAt: string; reason: string }) {
  return (
    <Callout variant="warning" icon={<ShieldAlert size={16} aria-hidden />}>
      {/* Only the author reads this notice; the same mark as every private item. */}
      <p className="removed-notice__title">
        <strong>{what} de {formatFullDate(createdAt)} foi removida pela moderação.</strong>
        <Badge>Privado</Badge>
      </p>
      <p>Motivo: {reason}</p>
    </Callout>
  )
}
