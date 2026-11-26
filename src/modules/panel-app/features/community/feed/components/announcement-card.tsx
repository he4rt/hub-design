import { useTransition } from 'react'
import { Megaphone, Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useNow } from '@/hooks/use-now'
import { formatFullDate, formatRelative } from '@/lib/feed-post'
import type { FeedAnnouncement, User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { canPinAnnouncement, setAnnouncementPinned } from '../actions'
import type { Notice } from './post-card'
import './announcement-card.css'

/**
 * Official announcement of the community, signed by He4rt Developers. A pinned one opens the
 * Feed; the staff pins and unpins it from the menu. No reactions: it is a notice, not a learning.
 */
export function AnnouncementCard({
  announcement,
  viewer,
  onNotice,
}: {
  announcement: FeedAnnouncement
  viewer: User
  onNotice: (notice: Notice) => void
}) {
  const [busy, startBusy] = useTransition()
  const now = useNow()
  const pinned = announcement.pinnedAt !== null

  function togglePin() {
    startBusy(async () => {
      try {
        await setAnnouncementPinned(viewer.id, announcement.id, !pinned)
        onNotice({ tone: 'success', text: pinned ? 'Comunicado desafixado.' : 'Comunicado fixado no topo do Feed.' })
      } catch (e) {
        onNotice({ tone: 'error', text: errorMessage(e) })
      }
    })
  }

  return (
    <Card className="announcement-card" data-pinned={pinned || undefined}>
      <header className="announcement-card__header">
        {/* A notice of the community, not a member's publication: signed in one line, without a photo. */}
        <p className="announcement-card__name">
          <Megaphone size={16} aria-hidden />
          <span>Comunicado da <strong>He4rt Developers</strong></span>
        </p>
        <p className="announcement-card__meta">
          {pinned && <><Pin size={13} aria-hidden /> Fixado, </>}
          <time dateTime={announcement.createdAt} title={formatFullDate(announcement.createdAt)}>
            {formatRelative(announcement.createdAt, now)}
          </time>
        </p>
        {canPinAnnouncement(viewer) && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" loading={busy} aria-label="Ações do comunicado">
                •••
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={togglePin}>{pinned ? 'Desafixar' : 'Fixar no topo do Feed'}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      <h3 className="announcement-card__title">{announcement.title}</h3>
      <p className="announcement-card__body">{announcement.body}</p>
    </Card>
  )
}
