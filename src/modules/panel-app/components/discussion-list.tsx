import { Link } from 'react-router'
import { CircleCheck, MessageSquare } from 'lucide-react'
import { useNow } from '@/hooks/use-now'
import { useDb, type Discussion } from '@/mocks/db'
import { formatDay, formatRelative } from '@/lib/dates'
import { categoryLabels, discussionContext, lastActivity } from '@/modules/panel-app/lib/discussions'
import './discussion-list.css'

/**
 * Forum discussions, newest activity first as given. Each row is one link to the discussion: the
 * title first, then a lighter line with the category (by its color), what it is about, who asked and
 * when; on the right, how many replies it has, or that it is solved. No photos: the replies matter.
 * The reply count belongs to the discussion; it never adds up on anyone's profile.
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
        const state = discussion.solvedReplyId ? 'solved' : replies === 0 ? 'unanswered' : 'answered'
        return (
          <li key={discussion.id} className="discussion-list__item" data-state={state}>
            <div className="discussion-list__main">
              {/* The title's link covers the whole row; the context keeps its own link above it. */}
              <Link to={`/app/discussions/${discussion.id}`} className="discussion-list__title" title={discussion.title}>
                {discussion.title}
              </Link>
              <p className="discussion-list__meta">
                {/* The color alone names the category, as in the filter column; the name stays for screen readers and on hover. */}
                <span
                  className="discussion-list__category"
                  data-category={discussion.category}
                  role="img"
                  aria-label={categoryLabels[discussion.category]}
                  title={categoryLabels[discussion.category]}
                />
                {context && (
                  <span className="discussion-list__context" title={`${context.kind}: ${context.label}`}>
                    {context.path ? <Link to={context.path}>{context.label}</Link> : context.label}
                  </span>
                )}
                {author && <span className="discussion-list__author">{author.name}</span>}
                <time dateTime={activity} title={`Última atividade: ${formatDay(activity)}`}>
                  {formatRelative(activity, now)}
                </time>
              </p>
            </div>
            <div className="discussion-list__status">
              <span
                className="discussion-list__replies"
                aria-label={replies === 0 ? 'Sem resposta' : replies === 1 ? '1 resposta' : `${replies} respostas`}
              >
                <MessageSquare size={16} aria-hidden />
                {replies === 0 ? 'Sem resposta' : replies}
              </span>
              {state === 'solved' && (
                <span className="discussion-list__solved">
                  <CircleCheck size={14} aria-hidden />
                  Resolvida
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
