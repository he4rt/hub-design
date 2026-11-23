import { Link } from 'react-router'
import { TrailLog, TrailLogItem } from '@/components/ui/trail-log'
import type { ForumItem } from '../lib/activity'
import './forum-activity.css'

/** The member's questions and answers in the forum, by date; an answer marked as the solution in success. */
export function ForumActivity({ items, firstName, isOwner }: { items: ForumItem[]; firstName: string; isOwner: boolean }) {
  if (items.length === 0) {
    return (
      <p className="forum-activity__empty">
        {isOwner ? 'Suas perguntas e respostas no Fórum aparecem aqui.' : `${firstName} ainda não participou do Fórum.`}
      </p>
    )
  }
  return (
    <TrailLog>
      {items.map((item) => (
        <TrailLogItem
          key={item.id}
          tone={item.solved ? 'success' : 'past'}
          title={
            <Link to={item.href} title={item.title}>
              {item.title}
            </Link>
          }
          meta={
            <>
              {item.kind}
              {item.solved && ', marcada como solução'}, <time dateTime={item.date}>{item.dateLabel}</time>
            </>
          }
        />
      ))}
    </TrailLog>
  )
}
