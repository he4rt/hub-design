import { Link } from 'react-router'
import { MessagesSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useNow } from '@/hooks/use-now'
import { useDb, type Discussion } from '@/mocks/db'
import { formatDay, formatRelative } from '@/lib/dates'
import { categoryLabels, discussionContext, lastActivity } from '@/modules/panel-app/lib/discussions'
import './discussion-list.css'

/**
 * Forum discussions, newest activity first as given. The reply count belongs to the
 * discussion, to show what still needs an answer; it never adds up on anyone's profile.
 */
export function DiscussionList({
  discussions,
  showContext = true,
  emptyText,
}: {
  discussions: Discussion[]
  /** Hide the context where the page already is about it, such as a project page. */
  showContext?: boolean
  emptyText: string
}) {
  const now = useNow()
  const squads = useDb((db) => db.squads)
  const projects = useDb((db) => db.projects)
  const memberProjects = useDb((db) => db.memberProjects)
  const posts = useDb((db) => db.feedPosts)
  const users = useDb((db) => db.users)

  if (discussions.length === 0) return <p className="discussion-list__empty">{emptyText}</p>

  return (
    <ol className="discussion-list">
      {discussions.map((discussion) => {
        const context = showContext ? discussionContext(discussion, { squads, projects, posts, users, memberProjects }) : null
        const author = users.find((user) => user.id === discussion.authorId)
        const activity = lastActivity(discussion)
        const replies = discussion.replies.length
        return (
          <li key={discussion.id} className="discussion-list__item">
            <div className="discussion-list__main">
              <Link to={`/app/discussions/${discussion.id}`} className="discussion-list__title" title={discussion.title}>
                {discussion.title}
              </Link>
              <p className="discussion-list__meta">
                <Badge>{categoryLabels[discussion.category]}</Badge>
                {context && (
                  <span className="discussion-list__context" title={`${context.kind}: ${context.label}`}>
                    {context.kind}:{' '}
                    {context.path ? <Link to={context.path}>{context.label}</Link> : context.label}
                  </span>
                )}
                {author && <span className="discussion-list__author">por {author.name}</span>}
              </p>
            </div>
            <div className="discussion-list__status">
              {discussion.solvedReplyId ? (
                <Badge variant="success">Resolvida</Badge>
              ) : (
                <span className="discussion-list__replies" data-empty={replies === 0 || undefined}>
                  <MessagesSquare size={14} aria-hidden />
                  {replies === 0 ? 'Sem resposta' : replies === 1 ? '1 resposta' : `${replies} respostas`}
                </span>
              )}
              <time dateTime={activity} title={`Última atividade: ${formatDay(activity)}`}>
                {formatRelative(activity, now)}
              </time>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
