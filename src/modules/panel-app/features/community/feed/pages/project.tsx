import { Navigate, useParams } from 'react-router'
import { NotFound } from '@/components/not-found'
import { useDb } from '@/mocks/db'

/** Existing project-help links now open their conversation in the forum. */
export default function FeedProject() {
  const { projectId } = useParams()
  const post = useDb((state) => state.feedPosts.find((post) => post.projectId === projectId && !post.deletedAt))
  const discussions = useDb((state) => state.discussions)
  const userId = useDb((state) => state.session?.userId)
  if (!post) return <NotFound />
  const discussion = discussions.find((discussion) => discussion.context?.type === 'post' && discussion.context.id === post.id)
  return <Navigate replace to={discussion ? `/app/discussions/${discussion.id}` : post.userId === userId ? `/app/discussions/new?post=${post.id}` : '/app/discussions'} />
}
